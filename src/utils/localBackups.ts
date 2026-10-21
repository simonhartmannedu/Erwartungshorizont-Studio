export type LocalBackupDateSource = "metadata" | "filename" | "file-modified" | "unknown";

export type LocalBackupPreliminaryStatus =
  | "not-checked"
  | "format-recognized"
  | "unlock-to-check"
  | "not-supported"
  | "not-readable";

export interface LocalBackupDescriptor {
  id: string;
  file: File;
  date: Date | null;
  dateSource: LocalBackupDateSource;
  preliminaryStatus: LocalBackupPreliminaryStatus;
}

export interface LocalBackupMonthGroup {
  key: string;
  label: string;
  entries: LocalBackupDescriptor[];
  totalSize: number;
}

export interface LocalBackupSchoolYearGroup {
  key: string;
  label: string;
  months: LocalBackupMonthGroup[];
  entryCount: number;
  totalSize: number;
}

const supportedEncryptedKinds = new Set([
  "ewh-app-backup",
  "ewh-student-database-backup",
  "ewh-schoolyear-workspace-archive",
]);

const isPlausibleDate = (date: Date) =>
  Number.isFinite(date.getTime()) && date.getFullYear() >= 2000 && date.getFullYear() <= 2100;

/** Only inspect the small, unencrypted envelope header. The encrypted payload is never read for listing. */
export const inspectBackupEnvelopeHeader = (header: string) => {
  const kind = header.match(/"kind"\s*:\s*"([^"\\]+)"/)?.[1] ?? null;
  const exportedAt = header.match(/"exportedAt"\s*:\s*"([^"\\]+)"/)?.[1] ?? null;
  const version = header.match(/"version"\s*:\s*(\d+)/)?.[1] ?? null;

  if (!kind) return { kind: null, exportedAt: null, status: "not-checked" as const };
  if (!supportedEncryptedKinds.has(kind) || (version !== "1" && version !== "2")) {
    return { kind, exportedAt: null, status: "not-supported" as const };
  }
  return { kind, exportedAt, status: "unlock-to-check" as const };
};

const dateFromFilename = (name: string) => {
  const match = name.match(/^(?:schueler-datenbank-backup|vollbackup-arbeitsstand|schuljahr-archiv)-(?:.*-)?(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})\.backup\.json$/i);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  return date.getFullYear() === Number(year)
    && date.getMonth() === Number(month) - 1
    && date.getDate() === Number(day)
    && isPlausibleDate(date)
    ? date
    : null;
};

export const resolveLocalBackupDate = ({
  exportedAt,
  filename,
  lastModified,
}: {
  exportedAt: string | null;
  filename: string;
  lastModified: number;
}): { date: Date | null; source: LocalBackupDateSource } => {
  if (exportedAt) {
    const metadataDate = new Date(exportedAt);
    if (isPlausibleDate(metadataDate)) return { date: metadataDate, source: "metadata" };
  }
  const filenameDate = dateFromFilename(filename);
  if (filenameDate) return { date: filenameDate, source: "filename" };
  const modifiedDate = new Date(lastModified);
  if (isPlausibleDate(modifiedDate)) return { date: modifiedDate, source: "file-modified" };
  return { date: null, source: "unknown" };
};

export const schoolYearForBackupDate = (date: Date) => {
  const startYear = date.getFullYear() - (date.getMonth() < 7 ? 1 : 0);
  return `${startYear}/${String((startYear + 1) % 100).padStart(2, "0")}`;
};

const monthLabel = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" });
const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export const groupLocalBackups = (entries: LocalBackupDescriptor[]): LocalBackupSchoolYearGroup[] => {
  const schoolYears = new Map<string, LocalBackupDescriptor[]>();
  const unknown: LocalBackupDescriptor[] = [];
  entries.forEach((entry) => {
    if (!entry.date) {
      unknown.push(entry);
      return;
    }
    const key = schoolYearForBackupDate(entry.date);
    schoolYears.set(key, [...(schoolYears.get(key) ?? []), entry]);
  });

  const groups = [...schoolYears.entries()].map(([key, schoolYearEntries]) => {
    const months = new Map<string, LocalBackupDescriptor[]>();
    schoolYearEntries.forEach((entry) => {
      const key = monthKey(entry.date!);
      months.set(key, [...(months.get(key) ?? []), entry]);
    });
    const groupedMonths = [...months.entries()]
      .sort(([left], [right]) => right.localeCompare(left))
      .map(([key, monthEntries]) => ({
        key,
        label: monthLabel.format(monthEntries[0].date!),
        entries: monthEntries.sort((left, right) => right.date!.getTime() - left.date!.getTime()),
        totalSize: monthEntries.reduce((sum, entry) => sum + entry.file.size, 0),
      }));
    return {
      key,
      label: `Schuljahr ${key}`,
      months: groupedMonths,
      entryCount: schoolYearEntries.length,
      totalSize: schoolYearEntries.reduce((sum, entry) => sum + entry.file.size, 0),
    };
  }).sort((left, right) => right.key.localeCompare(left.key));

  if (unknown.length) {
    groups.push({
      key: "unknown",
      label: "Datum unbekannt",
      months: [{
        key: "unknown",
        label: "Datum unbekannt",
        entries: unknown.sort((left, right) => right.file.lastModified - left.file.lastModified),
        totalSize: unknown.reduce((sum, entry) => sum + entry.file.size, 0),
      }],
      entryCount: unknown.length,
      totalSize: unknown.reduce((sum, entry) => sum + entry.file.size, 0),
    });
  }
  return groups;
};

export const formatLocalBackupSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
