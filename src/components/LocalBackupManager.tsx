import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { BACKUP_RETENTION_NOTICE } from "../utils/backupRetention";
import {
  formatLocalBackupSize,
  groupLocalBackups,
  inspectBackupEnvelopeHeader,
  LocalBackupDescriptor,
  LocalBackupPreliminaryStatus,
  resolveLocalBackupDate,
  schoolYearForBackupDate,
} from "../utils/localBackups";
import {
  listFilesInLocalBackupFolder,
  selectLocalBackupFolder,
  supportsLocalBackupFolder,
} from "../utils/localBackupFolder";
import { ConfirmDialog } from "./ConfirmDialog";
import { DownloadIcon, LoadingIcon, UploadIcon } from "./icons";
import { Card, Field } from "./ui";

const HEADER_BYTES = 64 * 1024;
const MAX_VALIDATION_BYTES = 50 * 1024 * 1024;

type EntryStatus = LocalBackupPreliminaryStatus | "restoration-checked";
type Source = { kind: "folder"; name: string } | { kind: "files" } | null;

const statusLabel: Record<EntryStatus, string> = {
  "not-checked": "Noch nicht geprüft",
  "format-recognized": "Format erkannt",
  "unlock-to-check": "Zum Prüfen entsperren",
  "restoration-checked": "Wiederherstellung geprüft",
  "not-supported": "Nicht unterstützt",
  "not-readable": "Nicht lesbar",
};

const fileId = (file: File) => `${file.name}:${file.size}:${file.lastModified}`;

const formatDateTime = (date: Date | null) => date
  ? new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(date)
  : "Datum unbekannt";

const dateSourceHint = (source: LocalBackupDescriptor["dateSource"]) => ({
  metadata: "Datum aus Backup-Metadaten",
  filename: "Datum aus Dateinamen",
  "file-modified": "Änderungsdatum der Datei (Ersatzangabe)",
  unknown: "Kein plausibles Sicherungsdatum verfügbar",
}[source]);

const toDescriptor = async (file: File): Promise<LocalBackupDescriptor> => {
  try {
    const header = await file.slice(0, HEADER_BYTES).text();
    const inspection = inspectBackupEnvelopeHeader(header);
    const resolvedDate = resolveLocalBackupDate({
      exportedAt: inspection.exportedAt,
      filename: file.name,
      lastModified: file.lastModified,
    });
    return {
      id: fileId(file),
      file,
      date: resolvedDate.date,
      dateSource: resolvedDate.source,
      preliminaryStatus: inspection.status === "not-checked" && resolvedDate.source === "filename"
        ? "format-recognized"
        : inspection.status,
    };
  } catch {
    return {
      id: fileId(file),
      file,
      date: null,
      dateSource: "unknown",
      preliminaryStatus: "not-readable",
    };
  }
};

interface Props {
  onCreateBackup: () => void;
  onValidateAndRestore: (file: File, passphrase: string) => Promise<boolean>;
  refreshToken?: string | null;
}

export const LocalBackupManager = ({ onCreateBackup, onValidateAndRestore, refreshToken }: Props) => {
  const [entries, setEntries] = useState<LocalBackupDescriptor[]>([]);
  const [source, setSource] = useState<Source>(null);
  const [state, setState] = useState<"idle" | "loading" | "empty" | "permission" | "unsupported" | "error">("idle");
  const [message, setMessage] = useState("");
  const [checked, setChecked] = useState<Record<string, EntryStatus>>({});
  const [openSchoolYears, setOpenSchoolYears] = useState<string[]>([]);
  const [openMonths, setOpenMonths] = useState<string[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<LocalBackupDescriptor | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [validating, setValidating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderSupported = supportsLocalBackupFolder();

  const inspectFiles = async (files: File[], nextSource: Source) => {
    setState("loading");
    setMessage("");
    setChecked({});
    const jsonFiles = files.filter((file) => file.name.toLowerCase().endsWith(".json"));
    const inspected = await Promise.all(jsonFiles.map(toDescriptor));
    setEntries(inspected);
    setSource(nextSource);
    setState(inspected.length ? "idle" : "empty");
  };

  const refreshFolder = async () => {
    if (!folderSupported) {
      setState("unsupported");
      return;
    }
    setState("loading");
    setMessage("");
    try {
      const { folderName, files } = await listFilesInLocalBackupFolder();
      await inspectFiles(files, { kind: "folder", name: folderName });
    } catch (error) {
      const code = error instanceof Error ? error.message : "LOCAL_BACKUP_FOLDER_READ_FAILED";
      setEntries([]);
      setSource(null);
      if (code === "LOCAL_BACKUP_FOLDER_PERMISSION_DENIED") {
        setState("permission");
        setMessage("Der zuvor ausgewählte Ordner ist nicht mehr lesbar. Wähle ihn bei Bedarf erneut aus.");
      } else if (code === "LOCAL_BACKUP_FOLDER_NOT_SELECTED") {
        setState("idle");
      } else {
        setState("error");
        setMessage("Der Sicherungsordner konnte nicht gelesen werden. Die Dateien wurden nicht verändert.");
      }
    }
  };

  useEffect(() => {
    if (folderSupported) void refreshFolder();
    // Only a handle from an earlier explicit directory selection is used here.
  }, []);

  useEffect(() => {
    if (folderSupported && source?.kind === "folder" && refreshToken) void refreshFolder();
  }, [refreshToken]);

  const chooseFolder = async () => {
    if (!folderSupported) {
      fileInputRef.current?.click();
      return;
    }
    try {
      setState("loading");
      const folderName = await selectLocalBackupFolder();
      await refreshFolder();
      setSource({ kind: "folder", name: folderName });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setState(entries.length ? "idle" : "idle");
        return;
      }
      setState("permission");
      setMessage("Der Ordnerzugriff wurde nicht eingerichtet. Wähle einen Ordner erneut aus oder verwende die Dateiauswahl.");
    }
  };

  const chooseFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length) void inspectFiles(files, { kind: "files" });
  };

  const groups = useMemo(() => groupLocalBackups(entries), [entries]);

  useEffect(() => {
    if (!groups.length) return;
    const currentSchoolYear = schoolYearForBackupDate(new Date());
    const initialSchoolYear = groups.find((group) => group.key === currentSchoolYear)?.key
      ?? groups.find((group) => group.key !== "unknown")?.key;
    const newestMonth = groups.find((group) => group.key === initialSchoolYear)?.months[0]?.key;
    if (initialSchoolYear) setOpenSchoolYears((current) => current.length ? current : [initialSchoolYear]);
    if (newestMonth) setOpenMonths((current) => current.length ? current : [newestMonth]);
  }, [groups]);

  const toggle = (key: string, current: string[], setCurrent: (value: string[]) => void) =>
    setCurrent(current.includes(key) ? current.filter((value) => value !== key) : [...current, key]);

  const beginValidation = (entry: LocalBackupDescriptor) => {
    if (entry.file.size > MAX_VALIDATION_BYTES) {
      setMessage("Diese Datei ist für die Prüfung in der Übersicht zu groß (maximal 50 MB). Nutze bei Bedarf den bestehenden Wiederherstellungsdialog.");
      return;
    }
    setSelectedEntry(entry);
    setPassphrase("");
  };

  const validate = async () => {
    if (!selectedEntry || !passphrase.trim()) return;
    setValidating(true);
    const entry = selectedEntry;
    setSelectedEntry(null);
    const valid = await onValidateAndRestore(entry.file, passphrase.trim());
    setValidating(false);
    setPassphrase("");
    if (valid) setChecked((current) => ({ ...current, [entry.id]: "restoration-checked" }));
  };

  return (
    <Card title="Lokale Sicherungen verwalten" subtitle="Nach Sicherungsdatum gruppiert. Eine Gesamtsicherung kann Daten aus mehreren Schuljahren enthalten.">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="button-primary gap-2" onClick={() => { void chooseFolder(); }}>
            <UploadIcon />
            {folderSupported ? "Sicherungsordner auswählen" : "Sicherungsdateien auswählen"}
          </button>
          {folderSupported ? (
            <button type="button" className="button-secondary gap-2" onClick={() => { void refreshFolder(); }} disabled={state === "loading"}>
              {state === "loading" ? <LoadingIcon /> : <UploadIcon />}
              Aktualisieren
            </button>
          ) : null}
          <button type="button" className="button-secondary gap-2" onClick={onCreateBackup}>
            <DownloadIcon />
            Neue Sicherung erstellen
          </button>
          <input ref={fileInputRef} type="file" accept="application/json,.json" multiple className="hidden" onChange={chooseFiles} />
        </div>

        {folderSupported ? (
          <button type="button" className="button-ghost text-sm" onClick={() => fileInputRef.current?.click()}>
            Stattdessen Sicherungsdateien auswählen
          </button>
        ) : null}

        {source?.kind === "files" ? <p className="status-note text-sm" role="status">Ansicht der ausgewählten Dateien. Es besteht keine dauerhafte Ordnerverbindung.</p> : null}
        {source?.kind === "folder" ? <p className="status-note text-sm" role="status">Ausgewählter lokaler Ordner: {source.name}. Dies ist keine Aussage über Cloudspeicher oder einen genehmigten Speicherort.</p> : null}
        {!folderSupported ? <p className="status-note text-sm" role="status">Dieser Browser unterstützt keine Ordneransicht. Wähle Dateien für eine einmalige Übersicht aus.</p> : null}
        <p className="themed-muted text-xs leading-5">„Format erkannt“ bestätigt nur einen bekannten Dateinamen oder Umschlag, nicht die vollständige Wiederherstellbarkeit. „Wiederherstellung geprüft“ erscheint erst nach erfolgreicher Entschlüsselung und Importvalidierung.</p>

        {state === "loading" ? <p className="surface-muted rounded-xl border p-4 text-sm" role="status">Sicherungsdateien werden gelesen. Für die Übersicht wird nur der unverschlüsselte Dateikopf geprüft.</p> : null}
        {state === "idle" && !source && <p className="surface-muted rounded-xl border p-4 text-sm">Noch keine Auswahl. Wähle einen Sicherungsordner oder einzelne Sicherungsdateien aus.</p>}
        {state === "empty" ? <p className="surface-muted rounded-xl border p-4 text-sm">Im ausgewählten Bereich wurden keine JSON-Sicherungsdateien gefunden.</p> : null}
        {state === "permission" || state === "error" || state === "unsupported" ? <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100" role="alert">{message || "Ordneransicht wird von diesem Browser nicht unterstützt. Wähle Sicherungsdateien für eine einmalige Übersicht aus."}</p> : null}
        {message && state === "idle" ? <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100" role="status">{message}</p> : null}

        {groups.map((schoolYear) => {
          const schoolYearOpen = openSchoolYears.includes(schoolYear.key);
          return (
            <section key={schoolYear.key} className="overflow-hidden rounded-xl border">
              <button type="button" className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.04]" aria-expanded={schoolYearOpen} onClick={() => toggle(schoolYear.key, openSchoolYears, setOpenSchoolYears)}>
                <span className="themed-strong font-semibold">{schoolYear.label} · {schoolYear.entryCount} Sicherungen</span>
                <span className="themed-muted shrink-0 text-xs">{formatLocalBackupSize(schoolYear.totalSize)}</span>
              </button>
              {schoolYearOpen ? (
                <div className="border-t">
                  {schoolYear.months.map((month) => {
                    const monthOpen = openMonths.includes(month.key);
                    return (
                      <section key={month.key} className="border-b last:border-b-0">
                        <button type="button" className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-black/[0.03] dark:hover:bg-white/[0.04]" aria-expanded={monthOpen} onClick={() => toggle(month.key, openMonths, setOpenMonths)}>
                          <span className="font-medium">{month.label} · {month.entries.length} Sicherungen</span>
                          <span className="themed-muted shrink-0 text-xs">{formatLocalBackupSize(month.totalSize)}</span>
                        </button>
                        {monthOpen ? (
                          <ul className="divide-y" aria-label={`Sicherungen aus ${month.label}`}>
                            {month.entries.map((entry) => {
                              const status = checked[entry.id] ?? entry.preliminaryStatus;
                              return (
                                <li key={entry.id} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                                  <div className="min-w-0">
                                    <p className="themed-strong truncate text-sm font-semibold" title={entry.file.name}>{entry.file.name}</p>
                                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                                      <span className="themed-muted">Sicherungsdatum: {formatDateTime(entry.date)}</span>
                                      <span className="rounded-md bg-black/[0.05] px-2 py-1 font-semibold dark:bg-white/[0.08]">Letzte Bearbeitung: {formatDateTime(new Date(entry.file.lastModified))}</span>
                                      <span className="themed-muted">{formatLocalBackupSize(entry.file.size)}</span>
                                    </div>
                                    <p className="themed-muted mt-1 text-xs">{dateSourceHint(entry.dateSource)} · Löschfrist prüfen</p>
                                    <p className="mt-2 text-xs font-medium" role="status">Prüfstatus: {statusLabel[status]}</p>
                                  </div>
                                  {status !== "not-supported" && status !== "not-readable" ? (
                                    <button type="button" className="button-secondary shrink-0 text-sm" onClick={() => beginValidation(entry)} disabled={validating}>
                                      {status === "restoration-checked" ? "Erneut prüfen" : "Entsperren und prüfen"}
                                    </button>
                                  ) : null}
                                </li>
                              );
                            })}
                          </ul>
                        ) : null}
                      </section>
                    );
                  })}
                </div>
              ) : null}
            </section>
          );
        })}

        <details className="surface-muted rounded-xl border p-4 text-sm leading-6">
          <summary className="themed-strong cursor-pointer font-semibold">Hinweis zu Löschfristen</summary>
          <p className="mt-3">{BACKUP_RETENTION_NOTICE.summary}</p>
          <div className="mt-3 space-y-2">
            {BACKUP_RETENTION_NOTICE.details.map((detail) => <p key={detail}>{detail}</p>)}
          </div>
          <p className="mt-3"><a className="underline" href={BACKUP_RETENTION_NOTICE.sourceUrl} target="_blank" rel="noreferrer">{BACKUP_RETENTION_NOTICE.sourceLabel}</a></p>
          <p className="themed-muted mt-2 text-xs">{BACKUP_RETENTION_NOTICE.sourceStatus}</p>
        </details>
      </div>

      <ConfirmDialog
        open={Boolean(selectedEntry)}
        title="Sicherung entsperren und prüfen"
        description="Das Passwort wird nur für diese Prüfung verwendet. Die vorhandene Wiederherstellungsprüfung zeigt den Inhalt zuerst an und verändert aktive Daten nicht."
        onCancel={() => { if (!validating) setSelectedEntry(null); }}
        onConfirm={() => { void validate(); }}
        confirmLabel={validating ? "Prüfung läuft" : "Prüfen und Vorschau öffnen"}
        confirmDisabled={!passphrase.trim() || validating}
        cancelDisabled={validating}
      >
        <Field label="Passwort dieser Backup-Datei" inputId="local-backup-check-passphrase">
          <input id="local-backup-check-passphrase" className="field" type="password" value={passphrase} autoComplete="current-password" onChange={(event) => setPassphrase(event.target.value)} />
        </Field>
      </ConfirmDialog>
    </Card>
  );
};
