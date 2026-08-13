export interface ImportedStudentRow {
  firstName: string;
  lastName: string;
  className: string;
}

export interface ImportSortOptions {
  field: "lastName" | "firstName";
  direction: "ascending" | "descending";
}

const normalizeHeader = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase("de-DE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");

const detectDelimiter = (headerLine: string) => {
  const candidates = [";", ",", "\t"];
  return candidates.reduce(
    (best, delimiter) => {
      const parts = headerLine.split(delimiter).length;
      return parts > best.count ? { delimiter, count: parts } : best;
    },
    { delimiter: ";", count: 0 },
  ).delimiter;
};

const splitRow = (line: string, delimiter: string) =>
  line
    .split(delimiter)
    .map((value) => value.trim().replace(/^"|"$/g, "").replace(/""/g, "\""));

const HEADER_ALIASES = {
  firstName: new Set(["vorname", "name", "firstname", "givenname", "rufname"]),
  lastName: new Set(["nachname", "lastname", "surname", "familienname"]),
  className: new Set(["klasse", "class", "classname", "lerngruppe"]),
};

const parseStudentRows = (rows: string[][]): ImportedStudentRow[] => {
  const normalizedRows = rows
    .map((row) => row.map((value) => value.trim()))
    .filter((row) => row.some(Boolean));

  if (normalizedRows.length === 0) {
    throw new Error("Die Importdatei enthält keine Schülerdaten.");
  }

  const headers = normalizedRows[0].map(normalizeHeader);

  const firstNameIndex = headers.findIndex((header) => HEADER_ALIASES.firstName.has(header));
  const lastNameIndex = headers.findIndex((header) => HEADER_ALIASES.lastName.has(header));
  const classNameIndex = headers.findIndex((header) => HEADER_ALIASES.className.has(header));

  if (firstNameIndex === -1 || lastNameIndex === -1 || classNameIndex === -1) {
    const headerlessRowsAreValid = normalizedRows.every(
      (cells) => cells.length >= 3 && Boolean(cells[0]) && Boolean(cells[1]) && Boolean(cells[2]),
    );

    if (!headerlessRowsAreValid) {
      throw new Error("Erwartete Spalten: Nachname, Name/Vorname, Klasse. Alternativ ist eine kopfzeilenlose Liste im Format Nachname, Vorname, Klasse möglich.");
    }

    return normalizedRows.map((cells, index) => {
      const [lastName, firstName, className] = cells;
      if (!lastName || !firstName || !className) {
        throw new Error(`Zeile ${index + 1} ist unvollständig.`);
      }
      return { firstName, lastName, className };
    });
  }

  if (normalizedRows.length < 2) {
    throw new Error("Die Importdatei braucht nach der Kopfzeile mindestens einen Datensatz.");
  }

  return normalizedRows.slice(1).flatMap((cells, index) => {
    const firstName = cells[firstNameIndex]?.trim() ?? "";
    const lastName = cells[lastNameIndex]?.trim() ?? "";
    const className = cells[classNameIndex]?.trim() ?? "";

    if (!firstName && !lastName && !className) {
      return [];
    }

    if (!firstName || !lastName || !className) {
      throw new Error(`Zeile ${index + 2} ist unvollstaendig.`);
    }

    return [{ firstName, lastName, className }];
  });
};

export const parseStudentImport = (content: string): ImportedStudentRow[] => {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.replace(/^\uFEFF/, "").trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error("Die Importdatei enthält keine Schülerdaten.");
  }

  const delimiter = detectDelimiter(lines[0]);
  return parseStudentRows(lines.map((line) => splitRow(line, delimiter)));
};

export const parseStudentImportFile = async (file: File): Promise<ImportedStudentRow[]> => {
  const fileName = file.name.toLocaleLowerCase("de-DE");
  if (fileName.endsWith(".csv") || fileName.endsWith(".txt")) {
    return parseStudentImport(await file.text());
  }

  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("Die Tabellen-Datei enthaelt kein Arbeitsblatt.");
  }

  const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(
    workbook.Sheets[firstSheetName],
    {
      header: 1,
      raw: false,
      defval: "",
    },
  );

  return parseStudentRows(rows.map((row) => row.map((value) => String(value ?? ""))));
};

export const sortImportedStudentRows = (
  rows: ImportedStudentRow[],
  options: ImportSortOptions,
): ImportedStudentRow[] => {
  const directionFactor = options.direction === "descending" ? -1 : 1;
  const collator = new Intl.Collator("de-DE", { sensitivity: "base", numeric: true });

  return [...rows].sort((left, right) => {
    const classComparison = collator.compare(left.className.trim(), right.className.trim());
    if (classComparison !== 0) return classComparison;

    const primaryComparison = collator.compare(left[options.field].trim(), right[options.field].trim());
    if (primaryComparison !== 0) return primaryComparison * directionFactor;

    const secondaryField = options.field === "lastName" ? "firstName" : "lastName";
    return collator.compare(left[secondaryField].trim(), right[secondaryField].trim()) * directionFactor;
  });
};

export const buildStudentAlias = (className: string, sequence: number, usedAliases: Set<string>) => {
  const classToken = className
    .trim()
    .toLocaleUpperCase("de-DE")
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 8) || "KLASSE";

  let current = Math.max(1, sequence);
  let candidate = `${classToken}-${String(current).padStart(2, "0")}`;

  while (usedAliases.has(candidate)) {
    current += 1;
    candidate = `${classToken}-${String(current).padStart(2, "0")}`;
  }

  usedAliases.add(candidate);
  return candidate;
};
