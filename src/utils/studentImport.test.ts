import { describe, expect, it } from "vitest";
import { parseStudentImport, parseStudentImportFile, sortImportedStudentRows } from "./studentImport";

describe("Schülerimport", () => {
  it("validiert Kopfzeilen und liest CSV ohne personenbezogene Testdaten", () => {
    expect(parseStudentImport("Vorname;Nachname;Klasse\nAlex;Beispiel;8b")).toEqual([
      { firstName: "Alex", lastName: "Beispiel", className: "8b" },
    ]);
    expect(() => parseStudentImport("Name;Klasse\nAlex;8b")).toThrow("Erwartete Spalten");
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
});
