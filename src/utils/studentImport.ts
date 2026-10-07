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

/**
 * Some exports from spreadsheet software contain UTF-8 bytes that were once
 * read as a western European encoding (for example, `MÃ¼ller`). Repair only
 * recognisable patterns so correctly encoded names stay untouched.
 */
const repairMojibake = (value: string) => {
  let repaired = value;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (!/(?:Ã[\u0080-\u00bf]|Â[\u0080-\u00bf]|â[\u0080-\u00bf][\u0080-\u00bf]|ï»¿)/.test(repaired)) {
      break;
    }

    const bytes = Array.from(repaired, (character) => character.charCodeAt(0));
    if (bytes.some((byte) => byte > 0xff)) break;

    try {
      const candidate = new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes));
      if (candidate === repaired) break;
      repaired = candidate;
    } catch {
      break;
    }
  }

  return repaired;
};

const cleanCell = (value: string) => repairMojibake(value).trim();

const decodeCsvFile = async (file: File) => {
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  }
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(bytes.subarray(3));
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    // Excel's legacy CSV export on Windows is commonly Windows-1252.
    return new TextDecoder("windows-1252").decode(bytes);
  }
};

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

const parseDelimitedRows = (content: string, delimiter: string) => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index]!;
    if (character === '"') {
      if (quoted && content[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      row.push(cleanCell(cell));
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && content[index + 1] === "\n") index += 1;
      row.push(cleanCell(cell));
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  row.push(cleanCell(cell));
  if (row.some(Boolean)) rows.push(row);
  return rows;
};

const HEADER_ALIASES = {
  firstName: new Set(["vorname", "name", "firstname", "givenname", "rufname"]),
  lastName: new Set(["nachname", "lastname", "surname", "familienname"]),
  className: new Set(["klasse", "class", "classname", "lerngruppe"]),
};

const parseStudentRows = (rows: string[][]): ImportedStudentRow[] => {
  const normalizedRows = rows
    .map((row) => row.map((value) => cleanCell(value)))
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
  const normalizedContent = content.replace(/^\uFEFF/, "");
  const firstLine = normalizedContent.split(/\r?\n/, 1)[0] ?? "";
  if (!firstLine.trim()) {
    throw new Error("Die Importdatei enthält keine Schülerdaten.");
  }

  const delimiter = detectDelimiter(firstLine);
  return parseStudentRows(parseDelimitedRows(normalizedContent, delimiter));
};

export const parseStudentImportFile = async (file: File): Promise<ImportedStudentRow[]> => {
  const fileName = file.name.toLocaleLowerCase("de-DE");
  if (fileName.endsWith(".csv") || fileName.endsWith(".txt")) {
    return parseStudentImport(await decodeCsvFile(file));
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

  return parseStudentRows(rows.map((row) => row.map((value) => cleanCell(String(value ?? "")))));
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
