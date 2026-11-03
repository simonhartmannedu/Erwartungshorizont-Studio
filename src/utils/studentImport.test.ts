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

  it("liest alle deutschen Umlaute aus UTF-8- und UTF-16-CSV-Dateien", async () => {
    const utf8Csv = new TextEncoder().encode("Vorname;Nachname;Klasse\nÄnne;Özdemir;10a\nÜmit;Müller;10a");
    const utf8File = {
      name: "klasse-utf8.csv",
      arrayBuffer: async () => utf8Csv.buffer,
    } as File;
    await expect(parseStudentImportFile(utf8File)).resolves.toEqual([
      { firstName: "Änne", lastName: "Özdemir", className: "10a" },
      { firstName: "Ümit", lastName: "Müller", className: "10a" },
    ]);

    const utf16Text = "Vorname;Nachname;Klasse\nÄnne;Özdemir;10a\nÜmit;Müller;10a";
    const utf16Bytes = new Uint8Array(utf16Text.length * 2);
    for (let index = 0; index < utf16Text.length; index += 1) {
      const codeUnit = utf16Text.charCodeAt(index);
      utf16Bytes[index * 2] = codeUnit & 0xff;
      utf16Bytes[index * 2 + 1] = codeUnit >> 8;
    }
    const utf16File = {
      name: "klasse-utf16.csv",
      arrayBuffer: async () => utf16Bytes.buffer,
    } as File;
    await expect(parseStudentImportFile(utf16File)).resolves.toEqual([
      { firstName: "Änne", lastName: "Özdemir", className: "10a" },
      { firstName: "Ümit", lastName: "Müller", className: "10a" },
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
