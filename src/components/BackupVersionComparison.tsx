import { compareBackupVersions } from "../utils/backup";
import { formatDateTime } from "../utils/format";

interface Props {
  localVersionAt: string | null;
  backupVersionAt: string | null;
  backupExportedAt: string | null;
  localSummary: string;
  backupSummary: string;
}

const relationCopy = {
  "backup-newer": {
    title: "Backup ist neuer",
    detail: "Der Datenstand im Backup ist neuer als der lokale Stand.",
    className: "border-emerald-500/40 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100",
  },
  "backup-older": {
    title: "Backup ist älter",
    detail: "Der lokale Datenstand enthält neuere Änderungen als das Backup.",
    className: "border-amber-500/40 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-100",
  },
  same: {
    title: "Gleicher Datenstand",
    detail: "Backup und lokaler Stand haben denselben letzten Änderungszeitpunkt.",
    className: "border-sky-500/40 bg-sky-50 text-sky-900 dark:bg-sky-950/30 dark:text-sky-100",
  },
  unknown: {
    title: "Zeitstand nicht vergleichbar",
    detail: "Für mindestens eine Seite fehlt ein verwertbarer Änderungszeitpunkt.",
    className: "border-slate-500/40 bg-slate-50 text-slate-900 dark:bg-slate-950/30 dark:text-slate-100",
  },
} as const;

const timestampLabel = (value: string | null) => value ? formatDateTime(value) : "Nicht verfügbar";

export const BackupVersionComparison = ({
  localVersionAt,
  backupVersionAt,
  backupExportedAt,
  localSummary,
  backupSummary,
}: Props) => {
  const comparison = compareBackupVersions(localVersionAt, backupVersionAt);
  const relation = relationCopy[comparison.relation];

  return (
    <section className="mt-4" aria-label="Versionsvergleich vor dem Import">
      <p className="label">Versionsvergleich</p>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <div className="surface-muted rounded-xl border p-3">
          <p className="label">Aktueller lokaler Stand</p>
          <p className="themed-strong mt-1 text-sm font-semibold">{timestampLabel(localVersionAt)}</p>
          <p className="themed-muted mt-1 text-xs leading-5">{localSummary}</p>
        </div>
        <div className="surface-muted rounded-xl border p-3">
          <p className="label">Backup-Datenstand</p>
          <p className="themed-strong mt-1 text-sm font-semibold">{timestampLabel(backupVersionAt)}</p>
          <p className="themed-muted mt-1 text-xs leading-5">{backupSummary}</p>
          {backupExportedAt ? <p className="themed-muted mt-2 text-xs">Datei erstellt: {formatDateTime(backupExportedAt)}</p> : null}
        </div>
      </div>
      <div className={`mt-3 rounded-xl border px-3 py-2 text-sm ${relation.className}`} role="status">
        <strong>{relation.title}.</strong> {relation.detail}
      </div>
    </section>
  );
};
