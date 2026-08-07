import { decryptText, encryptText } from "./crypto";
import { DraftBundle, ExpectationArchiveEntry, StudentDatabase } from "../types";
import { isStudentDatabase } from "./studentDatabase";
import { parseArchiveEntries, parseDraftBundle } from "./storage";
import {
  createStoredApplicationData,
  parseStoredApplicationData,
  StoredApplicationDataMigrationError,
} from "../infrastructure/migrations/storedApplicationData";
import { isValidApplicationDataShape } from "../infrastructure/validation/persistedData";
import { scopedStorageKey } from "./storageScope";

const BACKUP_METADATA_KEY = scopedStorageKey("student-database-last-backup-at");
const BACKUP_FAILURE_METADATA_KEY = scopedStorageKey("student-database-last-backup-failure");
const STALE_BACKUP_THRESHOLD_MS = 1000 * 60 * 60 * 24 * 7;
const URGENT_BACKUP_THRESHOLD_MS = 1000 * 60 * 60 * 24 * 30;
const CURRENT_BACKUP_FORMAT_VERSION = 2;

export type BackupStatusKind =
  | "no-data"
  | "never-saved"
  | "current"
  | "recommended"
  | "urgent"
  | "last-attempt-failed";

export interface BackupFailureMetadata {
  occurredAt: string;
  code: string;
}

export interface BackupStatus {
  kind: BackupStatusKind;
  tone: "info" | "warning" | "success" | "danger";
  summary: string;
  detail: string;
}

export type BackupValidationErrorCode =
  | "BACKUP_ENVELOPE_INVALID"
  | "BACKUP_DECRYPT_FAILED"
  | "BACKUP_JSON_INVALID"
  | "BACKUP_SCHEMA_UNSUPPORTED"
  | "BACKUP_PAYLOAD_INVALID";

export class BackupValidationError extends Error {
  constructor(
    readonly code: BackupValidationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "BackupValidationError";
  }
}

export interface EncryptedStudentDatabaseBackup {
  kind: "ewh-student-database-backup";
  version: 1 | 2;
  exportedAt: string;
  payload: Awaited<ReturnType<typeof encryptText>>;
}

export interface EncryptedAppBackup {
  kind: "ewh-app-backup";
  version: 1 | 2;
  exportedAt: string;
  payload: Awaited<ReturnType<typeof encryptText>>;
}

export interface EncryptedSchoolYearWorkspaceArchive {
  kind: "ewh-schoolyear-workspace-archive";
  version: 1 | 2;
  exportedAt: string;
  schoolYear: string;
  payload: Awaited<ReturnType<typeof encryptText>>;
}

interface AppBackupPayload {
  draftBundle: DraftBundle;
  studentDatabase: StudentDatabase;
  archiveEntries: ExpectationArchiveEntry[];
}

interface SchoolYearWorkspaceArchivePayload {
  draftBundle: DraftBundle;
  studentDatabase: StudentDatabase;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const parseDecryptedBackupPayload = (decrypted: string, version: 1 | 2): unknown => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(decrypted) as unknown;
  } catch {
    throw new BackupValidationError("BACKUP_JSON_INVALID", "Die Sicherungsdatei enthält kein gültiges JSON.");
  }

  if (version === 1) return parsed;

  try {
    return parseStoredApplicationData<unknown>(parsed).payload;
  } catch (error) {
    if (error instanceof StoredApplicationDataMigrationError && error.code === "STORAGE_SCHEMA_UNSUPPORTED") {
      throw new BackupValidationError("BACKUP_SCHEMA_UNSUPPORTED", error.message);
    }
    throw new BackupValidationError(
      "BACKUP_PAYLOAD_INVALID",
      "Die Sicherungsdatei enthält einen ungültigen Datenumschlag.",
    );
  }
};

const decryptBackupPayload = async (
  payload: Awaited<ReturnType<typeof encryptText>>,
  passphrase: string,
  version: 1 | 2,
) => {
  let decrypted: string;
  try {
    decrypted = await decryptText(payload, passphrase);
  } catch {
    throw new BackupValidationError(
      "BACKUP_DECRYPT_FAILED",
      "Das Backup-Passwort ist falsch oder die Sicherungsdatei ist beschädigt.",
    );
  }

  return parseDecryptedBackupPayload(decrypted, version);
};

export const isEncryptedStudentDatabaseBackup = (value: unknown): value is EncryptedStudentDatabaseBackup =>
  isPlainObject(value) &&
  value.kind === "ewh-student-database-backup" &&
  (value.version === 1 || value.version === CURRENT_BACKUP_FORMAT_VERSION) &&
  typeof value.exportedAt === "string" &&
  isPlainObject(value.payload) &&
  typeof value.payload.ciphertext === "string" &&
  typeof value.payload.iv === "string" &&
  typeof value.payload.salt === "string";

export const isEncryptedAppBackup = (value: unknown): value is EncryptedAppBackup =>
  isPlainObject(value) &&
  value.kind === "ewh-app-backup" &&
  (value.version === 1 || value.version === CURRENT_BACKUP_FORMAT_VERSION) &&
  typeof value.exportedAt === "string" &&
  isPlainObject(value.payload) &&
  typeof value.payload.ciphertext === "string" &&
  typeof value.payload.iv === "string" &&
  typeof value.payload.salt === "string";

export const isEncryptedSchoolYearWorkspaceArchive = (
  value: unknown,
): value is EncryptedSchoolYearWorkspaceArchive =>
  isPlainObject(value) &&
  value.kind === "ewh-schoolyear-workspace-archive" &&
  (value.version === 1 || value.version === CURRENT_BACKUP_FORMAT_VERSION) &&
  typeof value.exportedAt === "string" &&
  typeof value.schoolYear === "string" &&
  isPlainObject(value.payload) &&
  typeof value.payload.ciphertext === "string" &&
  typeof value.payload.iv === "string" &&
  typeof value.payload.salt === "string";

export const createEncryptedStudentDatabaseBackup = async (
  database: StudentDatabase,
  passphrase: string,
  exportedAt = new Date().toISOString(),
): Promise<EncryptedStudentDatabaseBackup> => ({
  kind: "ewh-student-database-backup",
  version: CURRENT_BACKUP_FORMAT_VERSION,
  exportedAt,
  payload: await encryptText(JSON.stringify(createStoredApplicationData(database, exportedAt)), passphrase),
});

export const createEncryptedAppBackup = async (
  payload: AppBackupPayload,
  passphrase: string,
  exportedAt = new Date().toISOString(),
): Promise<EncryptedAppBackup> => ({
  kind: "ewh-app-backup",
  version: CURRENT_BACKUP_FORMAT_VERSION,
  exportedAt,
  payload: await encryptText(JSON.stringify(createStoredApplicationData(payload, exportedAt)), passphrase),
});

export const createEncryptedSchoolYearWorkspaceArchive = async (
  payload: SchoolYearWorkspaceArchivePayload,
  passphrase: string,
  schoolYear: string,
  exportedAt = new Date().toISOString(),
): Promise<EncryptedSchoolYearWorkspaceArchive> => ({
  kind: "ewh-schoolyear-workspace-archive",
  version: CURRENT_BACKUP_FORMAT_VERSION,
  exportedAt,
  schoolYear,
  payload: await encryptText(JSON.stringify(createStoredApplicationData(payload, exportedAt)), passphrase),
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
  return `vollbackup-arbeitsstand-${datePart}_${timePart}.backup.json`;
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
  return `vollbackup-arbeitsstand-${classPart}-${datePart}_${timePart}.backup.json`;
};

export const buildSchoolYearArchiveFilename = (schoolYear: string, exportedAt: string) => {
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
  const schoolYearPart = sanitizeFilenamePart(schoolYear) || "ohne_schuljahr";
  return `schuljahr-archiv-${schoolYearPart}-${datePart}_${timePart}.backup.json`;
};

export const parseStudentDatabaseBackup = async (
  value: unknown,
  passphrase: string,
): Promise<StudentDatabase> => {
  if (!isEncryptedStudentDatabaseBackup(value)) {
    throw new BackupValidationError("BACKUP_ENVELOPE_INVALID", "Die Sicherungsdatei ist ungültig.");
  }

  const parsed = await decryptBackupPayload(value.payload, passphrase, value.version);

  if (!isStudentDatabase(parsed)) {
    throw new BackupValidationError(
      "BACKUP_PAYLOAD_INVALID",
      "Die Sicherungsdatei enthält keine gültige Schülerdatenbank.",
    );
  }

  return parsed;
};

export const parseAppBackup = async (
  value: unknown,
  passphrase: string,
): Promise<AppBackupPayload> => {
  if (!isEncryptedAppBackup(value)) {
    throw new BackupValidationError("BACKUP_ENVELOPE_INVALID", "Die Sicherungsdatei ist ungültig.");
  }

  const parsed = await decryptBackupPayload(value.payload, passphrase, value.version);

  if (!isPlainObject(parsed)) {
    throw new BackupValidationError(
      "BACKUP_PAYLOAD_INVALID",
      "Die Sicherungsdatei enthält keinen gültigen Arbeitsstand.",
    );
  }

  let draftBundle: DraftBundle | null;
  let archiveEntries: ExpectationArchiveEntry[];
  try {
    draftBundle = parseDraftBundle(JSON.stringify(parsed.draftBundle));
    archiveEntries = parseArchiveEntries(JSON.stringify(parsed.archiveEntries));
  } catch {
    throw new BackupValidationError(
      "BACKUP_PAYLOAD_INVALID",
      "Die Sicherungsdatei enthält ungültige Klassenarbeiten oder Archivdaten.",
    );
  }
  const studentDatabase = parsed.studentDatabase;

  if (!draftBundle) {
    throw new BackupValidationError(
      "BACKUP_PAYLOAD_INVALID",
      "Die Sicherungsdatei enthält keine gültigen Klassenarbeiten.",
    );
  }

  if (!isStudentDatabase(studentDatabase)) {
    throw new BackupValidationError(
      "BACKUP_PAYLOAD_INVALID",
      "Die Sicherungsdatei enthält keine gültige Schülerdatenbank.",
    );
  }

  const applicationData = {
    draftBundle,
    studentDatabase,
    archiveEntries,
  };
  if (!isValidApplicationDataShape(applicationData)) {
    throw new BackupValidationError("BACKUP_PAYLOAD_INVALID", "Die Sicherungsdatei enthält ungültige Datenfelder.");
  }

  return applicationData;
};

export const parseSchoolYearWorkspaceArchive = async (
  value: unknown,
  passphrase: string,
): Promise<SchoolYearWorkspaceArchivePayload & { schoolYear: string; exportedAt: string }> => {
  if (!isEncryptedSchoolYearWorkspaceArchive(value)) {
    throw new BackupValidationError("BACKUP_ENVELOPE_INVALID", "Die Schuljahr-Archivdatei ist ungültig.");
  }

  const parsed = await decryptBackupPayload(value.payload, passphrase, value.version);

  if (!isPlainObject(parsed)) {
    throw new BackupValidationError(
      "BACKUP_PAYLOAD_INVALID",
      "Die Schuljahr-Archivdatei enthält keinen gültigen Arbeitsstand.",
    );
  }

  let draftBundle: DraftBundle | null;
  try {
    draftBundle = parseDraftBundle(JSON.stringify(parsed.draftBundle));
  } catch {
    throw new BackupValidationError(
      "BACKUP_PAYLOAD_INVALID",
      "Die Schuljahr-Archivdatei enthält ungültige Klassenarbeiten.",
    );
  }
  const studentDatabase = parsed.studentDatabase;

  if (!draftBundle) {
    throw new BackupValidationError(
      "BACKUP_PAYLOAD_INVALID",
      "Die Schuljahr-Archivdatei enthält keine gültigen Klassenarbeiten.",
    );
  }

  if (!isStudentDatabase(studentDatabase)) {
    throw new BackupValidationError(
      "BACKUP_PAYLOAD_INVALID",
      "Die Schuljahr-Archivdatei enthält keine gültige Schülerdatenbank.",
    );
  }

  return {
    draftBundle,
    studentDatabase,
    schoolYear: value.schoolYear,
    exportedAt: value.exportedAt,
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
  window.localStorage.removeItem(BACKUP_FAILURE_METADATA_KEY);
};

export const clearBackupComplete = () => {
  window.localStorage.removeItem(BACKUP_METADATA_KEY);
};

export const loadLastBackupFailure = (): BackupFailureMetadata | null => {
  const raw = window.localStorage.getItem(BACKUP_FAILURE_METADATA_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as BackupFailureMetadata).occurredAt === "string" &&
      typeof (parsed as BackupFailureMetadata).code === "string"
    ) {
      return parsed as BackupFailureMetadata;
    }
  } catch {
    // Invalid diagnostic metadata is discarded; it never contains backup contents.
  }

  return null;
};

export const markBackupFailed = (code: string, occurredAt = new Date().toISOString()) => {
  window.localStorage.setItem(BACKUP_FAILURE_METADATA_KEY, JSON.stringify({ occurredAt, code }));
};

export const clearBackupFailure = () => {
  window.localStorage.removeItem(BACKUP_FAILURE_METADATA_KEY);
};

export const formatBackupRecency = (lastBackupAt: string | null, now = Date.now()) => {
  const timestamp = toTimestamp(lastBackupAt);
  if (!timestamp) return "noch nie";

  const ageMs = Math.max(0, now - timestamp);
  const days = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "heute";
  if (days === 1) return "vor 1 Tag";
  return `vor ${days} Tagen`;
};

export const describeBackupStatus = (
  database: StudentDatabase,
  lastBackupAt: string | null,
  lastBackupFailure: BackupFailureMetadata | null = null,
  now = Date.now(),
): BackupStatus => {
  if (database.groups.length === 0) {
    return {
      kind: "no-data",
      tone: "info" as const,
      summary: "Noch keine Schülerdaten vorhanden.",
      detail: "Sobald Lerngruppen oder Bewertungen existieren, lohnt sich ein verschlüsseltes Backup.",
    };
  }

  if (lastBackupFailure) {
    return {
      kind: "last-attempt-failed",
      tone: "danger",
      summary: "Letzter Sicherungsversuch fehlgeschlagen.",
      detail: "Die Daten liegen weiterhin nur lokal. Prüfe Speicherort und Passwort und erstelle zeitnah eine neue Sicherung.",
    };
  }

  const databaseUpdatedAt = toTimestamp(database.updatedAt);
  const backupTimestamp = toTimestamp(lastBackupAt);

  if (!backupTimestamp) {
    return {
      kind: "never-saved",
      tone: "warning" as const,
      summary: "Noch kein Backup exportiert.",
      detail: "Die Schülerdaten liegen nur in diesem Browserprofil. Exportiere jetzt eine verschlüsselte Sicherung.",
    };
  }

  if (now - backupTimestamp > URGENT_BACKUP_THRESHOLD_MS) {
    return {
      kind: "urgent",
      tone: "danger",
      summary: "Backup dringend empfohlen.",
      detail: "Die letzte Sicherung ist älter als 30 Tage. Erstelle vor der nächsten Änderung eine neue verschlüsselte Sicherung.",
    };
  }

  if ((databaseUpdatedAt ?? 0) > backupTimestamp) {
    return {
      kind: "recommended",
      tone: "warning" as const,
      summary: "Seit dem letzten Backup wurden Daten geändert.",
      detail: "Exportiere eine neue Sicherung, damit aktuelle Lerngruppen, Bewertungen und Kommentare nicht verloren gehen.",
    };
  }

  if (now - backupTimestamp > STALE_BACKUP_THRESHOLD_MS) {
    return {
      kind: "recommended",
      tone: "info" as const,
      summary: "Das letzte Backup ist älter als sieben Tage.",
      detail: "Plane vor dem Release und vor Browser-Updates einen frischen Export der Schülerdatenbank ein.",
    };
  }

  return {
    kind: "current",
    tone: "success" as const,
    summary: "Backup-Stand aktuell.",
    detail: "Die letzte verschlüsselte Sicherung deckt den aktuellen Datenstand ab.",
  };
};
