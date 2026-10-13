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

  it("lehnt Excel- und ODS-Dateien ab", async () => {
    for (const name of ["klasse.xls", "klasse.xlsx", "klasse.ods"]) {
      const file = { name, arrayBuffer: async () => new ArrayBuffer(0) } as File;
      await expect(parseStudentImportFile(file)).rejects.toThrow("CSV- oder TXT-Datei");
    }
  });
});
