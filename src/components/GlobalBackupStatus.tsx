import { formatBackupRecency, type BackupStatus } from "../utils/backup";

interface Props {
  status: BackupStatus;
  lastBackupAt: string | null;
  onOpenBackup: () => void;
}

export const GlobalBackupStatus = ({ status, lastBackupAt, onOpenBackup }: Props) => (
  <section className={`global-backup-status global-backup-status-${status.tone} no-print`} aria-label="Backup-Status">
    <div>
      <p className="label">Datensicherung</p>
      <p className="themed-strong text-sm font-semibold">{status.summary}</p>
      <p className="themed-muted mt-1 text-xs leading-5">
        Letzte Sicherung: {formatBackupRecency(lastBackupAt)}. 
        {status.detail}
      </p>
    </div>
    <button type="button" className="button-secondary shrink-0" onClick={onOpenBackup}>
      Jetzt sichern
    </button>
  </section>
);
