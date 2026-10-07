import { describe, expect, it } from "vitest";
import { parseStudentImport, parseStudentImportFile, sortImportedStudentRows } from "./studentImport";

describe("Schülerimport", () => {
  it("validiert Kopfzeilen und liest CSV ohne personenbezogene Testdaten", () => {
    expect(parseStudentImport("Vorname;Nachname;Klasse\nAlex;Beispiel;8b")).toEqual([
      { firstName: "Alex", lastName: "Beispiel", className: "8b" },
    ]);
    expect(() => parseStudentImport("Name;Klasse\nAlex;8b")).toThrow("Erwartete Spalten");
  });

  it("liest auch kopfzeilenlose TXT-Listen im dokumentierten Nachname-Vorname-Klasse-Format", () => {
    expect(parseStudentImport("Beispiel, Alex, 8b\nMuster, Samira, 8b")).toEqual([
      { firstName: "Alex", lastName: "Beispiel", className: "8b" },
      { firstName: "Samira", lastName: "Muster", className: "8b" },
    ]);
  });

  it("bewahrt Umlaute aus älteren Excel-CSV-Dateien und repariert bereits falsch gelesene Tabellenwerte", async () => {
    const windows1252Csv = new Uint8Array([
      ...new TextEncoder().encode("Vorname;Nachname;Klasse\nJ"),
      0xf6,
      ...new TextEncoder().encode("rg;M"),
      0xfc,
      ...new TextEncoder().encode("ller;10a"),
    ]);
    const file = {
      name: "klasse.csv",
      arrayBuffer: async () => windows1252Csv.buffer,
    } as File;

    await expect(parseStudentImportFile(file)).resolves.toEqual([
      { firstName: "Jörg", lastName: "Müller", className: "10a" },
    ]);
    expect(parseStudentImport("Vorname;Nachname;Klasse\nJÃ¶rg;MÃ¼ller;10a")).toEqual([
      { firstName: "Jörg", lastName: "Müller", className: "10a" },
    ]);
  });

  it("sortiert Importdaten stabil nach Klasse und dem gewählten Feld", () => {
    const sorted = sortImportedStudentRows(
      [
        { firstName: "Berta", lastName: "Zwei", className: "8b" },
        { firstName: "Alex", lastName: "Eins", className: "8a" },
      ],
      { field: "lastName", direction: "ascending" },
    );

    expect(sorted.map((row) => row.className)).toEqual(["8a", "8b"]);
  });

  it("reads a generated XLSX roster with the same validation as CSV", async () => {
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["Vorname", "Nachname", "Klasse"],
        ["Alex", "Beispiel", "8b"],
      ]),
      "Lerngruppe",
    );
    const content = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const file = {
      name: "fiktive-lerngruppe.xlsx",
      arrayBuffer: async () => content,
    } as File;

    await expect(parseStudentImportFile(file)).resolves.toEqual([
      { firstName: "Alex", lastName: "Beispiel", className: "8b" },
    ]);
  });

  it("liest Umlaute aus Excel- und LibreOffice-Calc-Dateien", async () => {
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["Vorname", "Nachname", "Klasse"],
        ["Jörg", "Müller", "10ä"],
      ]),
      "Lerngruppe",
    );

    for (const [bookType, extension] of [["xlsx", "xlsx"], ["ods", "ods"]] as const) {
      const content = XLSX.write(workbook, { bookType, type: "array" });
      const file = { name: `klasse.${extension}`, arrayBuffer: async () => content } as File;
      await expect(parseStudentImportFile(file)).resolves.toEqual([
        { firstName: "Jörg", lastName: "Müller", className: "10ä" },
      ]);
    }
  });
});
