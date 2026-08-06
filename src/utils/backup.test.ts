import { beforeAll, describe, expect, it } from "vitest";
import {
  BackupValidationError,
  clearBackupFailure,
  createEncryptedStudentDatabaseBackup,
  describeBackupStatus,
  isEncryptedAppBackup,
  loadLastBackupFailure,
  markBackupComplete,
  markBackupFailed,
  parseAppBackup,
  parseStudentDatabaseBackup,
} from "./backup";
import { StudentDatabase } from "../types";

const localStorageState = new Map<string, string>();

beforeAll(() => {
  Object.assign(globalThis, {
    window: {
      crypto: globalThis.crypto,
      btoa: (value: string) => Buffer.from(value, "binary").toString("base64"),
      atob: (value: string) => Buffer.from(value, "base64").toString("binary"),
      localStorage: {
        getItem: (key: string) => localStorageState.get(key) ?? null,
        setItem: (key: string, value: string) => localStorageState.set(key, String(value)),
        removeItem: (key: string) => localStorageState.delete(key),
      },
    },
  });
});

const validBackupEnvelope = {
  kind: "ewh-app-backup",
  version: 1,
  exportedAt: "2026-08-01T12:00:00.000Z",
  payload: { ciphertext: "AA==", iv: "AA==", salt: "AA==" },
};

const databaseWithStudentData = {
  version: 1,
  groups: [{}],
  assessments: {},
  updatedAt: "2026-08-06T12:00:00.000Z",
} as StudentDatabase;

describe("Backup-Validierung", () => {
  it("akzeptiert nur den bekannten, vollständigen Backup-Umschlag", () => {
    expect(isEncryptedAppBackup(validBackupEnvelope)).toBe(true);
    expect(isEncryptedAppBackup({ ...validBackupEnvelope, version: 2 })).toBe(true);
    expect(isEncryptedAppBackup({ ...validBackupEnvelope, version: 3 })).toBe(false);
    expect(isEncryptedAppBackup({ ...validBackupEnvelope, payload: { ciphertext: "AA==" } })).toBe(false);
  });

  it("bricht bei unbekannter Backup-Version ab, bevor Daten entschlüsselt werden", async () => {
    await expect(parseAppBackup({ ...validBackupEnvelope, version: 3 }, "test-passwort")).rejects.toMatchObject({
      code: "BACKUP_ENVELOPE_INVALID",
    } satisfies Partial<BackupValidationError>);
  });

  it("liefert für ein falsches Passwort einen sicheren, verwertbaren Fehlercode", async () => {
    const backup = await createEncryptedStudentDatabaseBackup(
      { version: 1, groups: [], assessments: {}, updatedAt: "2026-08-06T12:00:00.000Z" },
      "richtiges-test-passwort",
      "2026-08-06T12:00:00.000Z",
    );

    await expect(parseStudentDatabaseBackup(backup, "falsches-test-passwort")).rejects.toMatchObject({
      code: "BACKUP_DECRYPT_FAILED",
    } satisfies Partial<BackupValidationError>);
  });

  it("unterscheidet aktuelle, empfohlene, dringende und fehlgeschlagene Sicherungen", () => {
    const now = Date.parse("2026-08-31T12:00:00.000Z");

    expect(describeBackupStatus(databaseWithStudentData, null, null, now).kind).toBe("never-saved");
    expect(describeBackupStatus(databaseWithStudentData, "2026-08-31T12:00:00.000Z", null, now).kind).toBe("current");
    expect(describeBackupStatus(databaseWithStudentData, "2026-08-20T12:00:00.000Z", null, now).kind).toBe("recommended");
    expect(describeBackupStatus(databaseWithStudentData, "2026-07-01T12:00:00.000Z", null, now).kind).toBe("urgent");
    expect(
      describeBackupStatus(databaseWithStudentData, "2026-08-31T12:00:00.000Z", {
        occurredAt: "2026-08-31T12:00:00.000Z",
        code: "BACKUP_EXPORT_FAILED",
      }, now).kind,
    ).toBe("last-attempt-failed");
  });

  it("speichert nur generische Metadaten eines fehlgeschlagenen Backup-Versuchs", () => {
    clearBackupFailure();
    markBackupFailed("BACKUP_EXPORT_FAILED", "2026-08-06T12:00:00.000Z");
    expect(loadLastBackupFailure()).toEqual({
      occurredAt: "2026-08-06T12:00:00.000Z",
      code: "BACKUP_EXPORT_FAILED",
    });

    markBackupComplete("2026-08-06T12:01:00.000Z");
    expect(loadLastBackupFailure()).toBeNull();
  });
});
