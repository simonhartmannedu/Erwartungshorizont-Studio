import { describe, expect, it } from "vitest";
import {
  groupLocalBackups,
  isBackupOlderThanOneSchoolYear,
  inspectBackupEnvelopeHeader,
  LocalBackupDescriptor,
  resolveLocalBackupDate,
  schoolYearForBackupDate,
} from "./localBackups";

const file = (name: string, size = 1024, lastModified = Date.parse("2026-08-02T10:00:00")) =>
  ({ name, size, lastModified }) as File;

const entry = (name: string, date: Date | null): LocalBackupDescriptor => ({
  id: name,
  file: file(name),
  date,
  dateSource: date ? "metadata" : "unknown",
  preliminaryStatus: "unlock-to-check",
});

describe("lokale Sicherungsübersicht", () => {
  it("beginnt das Schuljahr am 1. August", () => {
    expect(schoolYearForBackupDate(new Date(2026, 6, 31, 23, 59))).toBe("2025/26");
    expect(schoolYearForBackupDate(new Date(2026, 7, 1, 0, 0))).toBe("2026/27");
  });

  it("markiert Sicherungen erst nach mehr als einem abgeschlossenen Schuljahr", () => {
    const reference = new Date(2026, 9, 23); // Schuljahr 2026/27
    expect(isBackupOlderThanOneSchoolYear(new Date(2024, 9, 1), reference)).toBe(true);
    expect(isBackupOlderThanOneSchoolYear(new Date(2025, 9, 1), reference)).toBe(false);
    expect(isBackupOlderThanOneSchoolYear(new Date(2026, 7, 1), reference)).toBe(false);
  });

  it("nutzt valide Metadaten vor Dateiname und Änderungsdatum", () => {
    const fromMetadata = resolveLocalBackupDate({
      exportedAt: "2026-08-01T21:30:00.000Z",
      filename: "vollbackup-arbeitsstand-2025-01-02_03-04-05.backup.json",
      lastModified: Date.parse("2024-01-01T00:00:00"),
    });
    expect(fromMetadata.source).toBe("metadata");
    expect(fromMetadata.date?.toISOString()).toBe("2026-08-01T21:30:00.000Z");

    const fromFilename = resolveLocalBackupDate({
      exportedAt: "kein Datum",
      filename: "vollbackup-arbeitsstand-2026-08-01_09-10-11.backup.json",
      lastModified: Date.parse("2024-01-01T00:00:00"),
    });
    expect(fromFilename.source).toBe("filename");
    expect(fromFilename.date?.getFullYear()).toBe(2026);

    const fromModified = resolveLocalBackupDate({
      exportedAt: null,
      filename: "altes-backup.json",
      lastModified: Date.parse("2026-08-02T10:00:00"),
    });
    expect(fromModified.source).toBe("file-modified");

    expect(resolveLocalBackupDate({
      exportedAt: null,
      filename: "unbekannt-2026-08-02_10-00-00.backup.json",
      lastModified: Date.parse("2026-08-02T10:00:00"),
    }).source).toBe("file-modified");
  });

  it("sortiert Schuljahre, Monate und unbekannte Daten absteigend", () => {
    const grouped = groupLocalBackups([
      entry("juli.json", new Date(2026, 6, 31, 12)),
      entry("oktober.json", new Date(2026, 9, 2, 12)),
      entry("august.json", new Date(2026, 7, 1, 12)),
      entry("unbekannt.json", null),
    ]);
    expect(grouped.map((group) => group.key)).toEqual(["2026/27", "2025/26", "unknown"]);
    expect(grouped[0].months.map((month) => month.key)).toEqual(["2026-10", "2026-08"]);
    expect(grouped[2].months[0].entries[0].file.name).toBe("unbekannt.json");
  });

  it("erkennt nur bekannte, unterstützte verschlüsselte Umschläge als entsperrbar", () => {
    expect(inspectBackupEnvelopeHeader('{"kind":"ewh-app-backup","version":2,"exportedAt":"2026-08-01T12:00:00.000Z"}').status).toBe("unlock-to-check");
    expect(inspectBackupEnvelopeHeader('{"kind":"ewh-app-backup","version":7}').status).toBe("not-supported");
    expect(inspectBackupEnvelopeHeader('{"version":2}').status).toBe("not-checked");
  });
});
