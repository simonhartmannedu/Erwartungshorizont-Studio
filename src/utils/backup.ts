import { decryptText, encryptText } from "./crypto";
import { DraftBundle, ExpectationArchiveEntry, StudentDatabase } from "../types";
import { isStudentDatabase } from "./studentDatabase";
import { isArchiveEntry } from "./archive";
import { parseDraftBundle } from "./storage";

const BACKUP_METADATA_KEY = "ewh-student-database-last-backup-at";
const STALE_BACKUP_THRESHOLD_MS = 1000 * 60 * 60 * 24 * 7;

export interface EncryptedStudentDatabaseBackup {
  kind: "ewh-student-database-backup";
  version: 1;
  exportedAt: string;
  payload: Awaited<ReturnType<typeof encryptText>>;
}

export interface EncryptedAppBackup {
  kind: "ewh-app-backup";
  version: 1;
  exportedAt: string;
  payload: Awaited<ReturnType<typeof encryptText>>;
}

interface AppBackupPayload {
  draftBundle: DraftBundle;
  studentDatabase: StudentDatabase;
  archiveEntries: ExpectationArchiveEntry[];
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const isEncryptedStudentDatabaseBackup = (value: unknown): value is EncryptedStudentDatabaseBackup =>
  isPlainObject(value) &&
  value.kind === "ewh-student-database-backup" &&
  value.version === 1 &&
  typeof value.exportedAt === "string" &&
  isPlainObject(value.payload) &&
  typeof value.payload.ciphertext === "string" &&
  typeof value.payload.iv === "string" &&
  typeof value.payload.salt === "string";

export const isEncryptedAppBackup = (value: unknown): value is EncryptedAppBackup =>
  isPlainObject(value) &&
  value.kind === "ewh-app-backup" &&
  value.version === 1 &&
  typeof value.exportedAt === "string" &&
  isPlainObject(value.payload) &&
  typeof value.payload.ciphertext === "string" &&
  typeof value.payload.iv === "string" &&
  typeof value.payload.salt === "string";

export const createEncryptedStudentDatabaseBackup = async (
  database: StudentDatabase,
  passphrase: string,
): Promise<EncryptedStudentDatabaseBackup> => ({
  kind: "ewh-student-database-backup",
  version: 1,
  exportedAt: new Date().toISOString(),
  payload: await encryptText(JSON.stringify(database), passphrase),
});

export const createEncryptedAppBackup = async (
  payload: AppBackupPayload,
  passphrase: string,
): Promise<EncryptedAppBackup> => ({
  kind: "ewh-app-backup",
  version: 1,
  exportedAt: new Date().toISOString(),
  payload: await encryptText(JSON.stringify(payload), passphrase),
});

export const buildStudentDatabaseBackupFilename = (exportedAt: string) => {
  const exportedAtDate = new Date(exportedAt);
  const timestamp = Number.isNaN(exportedAtDate.getTime())
    ? new Date()
    : exportedAtDate;

  const parts = new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(timestamp);

  const valueByType = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const datePart = `${valueByType.year}-${valueByType.month}-${valueByType.day}`;
  const timePart = `${valueByType.hour}-${valueByType.minute}-${valueByType.second}`;
  return `schueler-datenbank-backup-${datePart}_${timePart}.backup.json`;
};

export const buildAppBackupFilename = (exportedAt: string) => {
  const exportedAtDate = new Date(exportedAt);
  const timestamp = Number.isNaN(exportedAtDate.getTime())
    ? new Date()
    : exportedAtDate;

  const parts = new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(timestamp);

  const valueByType = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const datePart = `${valueByType.year}-${valueByType.month}-${valueByType.day}`;
  const timePart = `${valueByType.hour}-${valueByType.minute}-${valueByType.second}`;
  return `arbeitsstand-backup-${datePart}_${timePart}.backup.json`;
};

const sanitizeFilenamePart = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

export const buildAppBackupFilenameForClass = (exportedAt: string, className?: string | null) => {
  const exportedAtDate = new Date(exportedAt);
  const timestamp = Number.isNaN(exportedAtDate.getTime())
    ? new Date()
    : exportedAtDate;

  const parts = new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(timestamp);

  const valueByType = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const datePart = `${valueByType.year}-${valueByType.month}-${valueByType.day}`;
  const timePart = `${valueByType.hour}-${valueByType.minute}-${valueByType.second}`;
  const classPart = className ? sanitizeFilenamePart(className) : "ohne_klasse";
  return `arbeitsstand-backup-${classPart}-${datePart}_${timePart}.backup.json`;
};

export const parseStudentDatabaseBackup = async (
  value: unknown,
  passphrase: string,
): Promise<StudentDatabase> => {
  if (!isEncryptedStudentDatabaseBackup(value)) {
    throw new Error("Die Sicherungsdatei ist ungültig.");
  }

  const decrypted = await decryptText(value.payload, passphrase);
  const parsed = JSON.parse(decrypted) as unknown;

  if (!isStudentDatabase(parsed)) {
    throw new Error("Die Sicherungsdatei enthält keine gültige Schülerdatenbank.");
  }

  return parsed;
};

export const parseAppBackup = async (
  value: unknown,
  passphrase: string,
): Promise<AppBackupPayload> => {
  if (!isEncryptedAppBackup(value)) {
    throw new Error("Die Sicherungsdatei ist ungültig.");
  }

  const decrypted = await decryptText(value.payload, passphrase);
  const parsed = JSON.parse(decrypted) as unknown;

  if (!isPlainObject(parsed)) {
    throw new Error("Die Sicherungsdatei enthält keinen gültigen Arbeitsstand.");
  }

  const draftBundle = parseDraftBundle(JSON.stringify(parsed.draftBundle));
  const studentDatabase = parsed.studentDatabase;
  const archiveEntries = parsed.archiveEntries;

  if (!draftBundle) {
    throw new Error("Die Sicherungsdatei enthält keine gültigen Klassenarbeiten.");
  }

  if (!isStudentDatabase(studentDatabase)) {
    throw new Error("Die Sicherungsdatei enthält keine gültige Schülerdatenbank.");
  }

  if (!Array.isArray(archiveEntries) || !archiveEntries.every(isArchiveEntry)) {
    throw new Error("Die Sicherungsdatei enthält kein gültiges Erwartungshorizont-Archiv.");
  }

  return {
    draftBundle,
    studentDatabase,
    archiveEntries,
  };
};

const toTimestamp = (value: string | null) => {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
};

export const loadLastBackupAt = () => window.localStorage.getItem(BACKUP_METADATA_KEY);

export const markBackupComplete = (exportedAt: string) => {
  window.localStorage.setItem(BACKUP_METADATA_KEY, exportedAt);
};

export const clearBackupComplete = () => {
  window.localStorage.removeItem(BACKUP_METADATA_KEY);
};

export const describeBackupStatus = (database: StudentDatabase, lastBackupAt: string | null) => {
  if (database.groups.length === 0) {
    return {
      tone: "info" as const,
      summary: "Noch keine Schülerdaten vorhanden.",
      detail: "Sobald Lerngruppen oder Bewertungen existieren, lohnt sich ein verschlüsseltes Backup.",
    };
  }

  const databaseUpdatedAt = toTimestamp(database.updatedAt);
  const backupTimestamp = toTimestamp(lastBackupAt);

  if (!backupTimestamp) {
    return {
      tone: "warning" as const,
      summary: "Noch kein Backup exportiert.",
      detail: "Die Schülerdaten liegen nur in diesem Browserprofil. Exportiere jetzt eine verschlüsselte Sicherung.",
    };
  }

  if ((databaseUpdatedAt ?? 0) > backupTimestamp) {
    return {
      tone: "warning" as const,
      summary: "Seit dem letzten Backup wurden Daten geändert.",
      detail: "Exportiere eine neue Sicherung, damit aktuelle Lerngruppen, Bewertungen und Kommentare nicht verloren gehen.",
    };
  }

  if (Date.now() - backupTimestamp > STALE_BACKUP_THRESHOLD_MS) {
    return {
      tone: "info" as const,
      summary: "Das letzte Backup ist älter als sieben Tage.",
      detail: "Plane vor dem Release und vor Browser-Updates einen frischen Export der Schülerdatenbank ein.",
    };
  }

  return {
    tone: "success" as const,
    summary: "Backup-Stand aktuell.",
    detail: "Die letzte verschlüsselte Sicherung deckt den aktuellen Datenstand ab.",
  };
};
