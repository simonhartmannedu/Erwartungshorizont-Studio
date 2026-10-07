import { ChangeEvent, useState } from "react";
import { CloudUploadIcon, DownloadIcon, DuplicateIcon, UploadIcon } from "./icons";
import { ConfirmDialog } from "./ConfirmDialog";
import { Card, DismissibleCallout, Field } from "./ui";

interface Props {
  backupStatus: {
    tone: "info" | "warning" | "success" | "danger";
    summary: string;
    detail: string;
  };
  lastBackupAt: string | null;
  canRollbackImport: boolean;
  onExportFullBackup: (passphrase: string) => Promise<boolean>;
  onImportBackup: (file: File, passphrase: string) => void;
  onRollbackImport: () => void;
  nextcloudFolderName: string | null;
  nextcloudFolderSupported: boolean;
  onConnectNextcloudFolder: () => Promise<string | null>;
  onSyncNextcloud: (passphrase: string) => Promise<boolean>;
  onLoadLatestNextcloudBackup: () => Promise<File | null>;
}

const PasswordField = ({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <Field label={label}>
      <div className="flex gap-2">
        <input
          className="field min-w-0 flex-1"
          type={visible ? "text" : "password"}
          value={value}
          placeholder={placeholder}
          autoComplete="new-password"
          spellCheck={false}
          autoCapitalize="off"
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className="button-secondary shrink-0 px-3"
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? "Verbergen" : "Anzeigen"}
        </button>
      </div>
    </Field>
  );
};

export const BackupPanel = ({
  backupStatus,
  lastBackupAt,
  canRollbackImport,
  onExportFullBackup,
  onImportBackup,
  onRollbackImport,
  nextcloudFolderName,
  nextcloudFolderSupported,
  onConnectNextcloudFolder,
  onSyncNextcloud,
  onLoadLatestNextcloudBackup,
}: Props) => {
  const [backupDialog, setBackupDialog] = useState<"save" | "restore" | "nextcloud" | "nextcloud-connect" | null>(null);
  const [fullBackupPassphrase, setFullBackupPassphrase] = useState("");
  const [selectedFullBackupFile, setSelectedFullBackupFile] = useState<File | null>(null);
  const [nextcloudBackupPassphrase, setNextcloudBackupPassphrase] = useState("");
  const [nextcloudAcknowledged, setNextcloudAcknowledged] = useState(false);
  const selectFullBackupFile = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedFullBackupFile(event.target.files?.[0] ?? null);
    event.target.value = "";
  };

  const saveFullBackup = async () => {
    const saved = await onExportFullBackup(fullBackupPassphrase);
    if (saved) {
      setBackupDialog(null);
      setFullBackupPassphrase("");
    }
  };

  const inspectFullBackup = () => {
    if (!selectedFullBackupFile || !fullBackupPassphrase.trim()) return;
    onImportBackup(selectedFullBackupFile, fullBackupPassphrase);
    setBackupDialog(null);
  };

  const syncNextcloud = async () => {
    const synced = await onSyncNextcloud(nextcloudBackupPassphrase);
    if (synced) {
      setBackupDialog(null);
      setNextcloudBackupPassphrase("");
    }
  };

  const connectNextcloudFolder = async () => {
    const folderName = await onConnectNextcloudFolder();
    if (folderName) setBackupDialog(null);
  };

  const loadLatestNextcloudBackup = async () => {
    const backup = await onLoadLatestNextcloudBackup();
    if (!backup) return;
    setSelectedFullBackupFile(backup);
    setFullBackupPassphrase("");
    setBackupDialog("restore");
  };

  return (
    <div className="space-y-6 no-print">
      <details className="surface-muted rounded-2xl border p-4">
        <summary className="themed-strong cursor-pointer text-sm font-semibold">Wie sind meine Daten gespeichert und geschützt?</summary>
        <div className="mt-4 grid gap-3 text-sm leading-6 md:grid-cols-3">
          <p><strong>Automatisch speichern:</strong> Änderungen bleiben in diesem Browser.</p>
          <p><strong>EWH-Versionen:</strong> sichern frühere Erwartungshorizonte, aber keine Schülerpunkte.</p>
          <p><strong>Backup-Datei:</strong> ist verschlüsselt und schützt bei Gerätewechsel oder Datenverlust.</p>
        </div>
      </details>

      <Card title="Sicherungen" subtitle="Die lokale Backup-Datei ist dein verlässlicher Ausgangspunkt. Zusätzliche Ablagen bleiben optional.">
        <div className="space-y-4">
          <DismissibleCallout tone={backupStatus.tone} resetKey={`${backupStatus.summary}-${lastBackupAt ?? "none"}`}>
            <p className="font-semibold">{backupStatus.summary}</p>
            <p>{backupStatus.detail}</p>
          </DismissibleCallout>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
            <section className="backup-action-card backup-action-card-save rounded-2xl border p-4" aria-labelledby="local-backup-title">
              <div className="flex items-start gap-3">
                <span className="backup-action-icon" aria-hidden="true"><DownloadIcon /></span>
                <div>
                  <p className="backup-action-kicker">Empfohlen</p>
                  <h3 id="local-backup-title" className="themed-strong text-base font-semibold">Lokales Backup</h3>
                  <p className="themed-muted mt-1 text-sm leading-5">Verschlüsselte Datei speichern oder wiederherstellen.</p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <button type="button" className="button-primary backup-choice-button w-full" onClick={() => setBackupDialog("save")}>
                  <DownloadIcon />
                  Backup speichern
                </button>
                <button type="button" className="button-secondary backup-choice-button w-full" onClick={() => setBackupDialog("restore")}>
                  <UploadIcon />
                  Wiederherstellen
                </button>
              </div>
              <p className="backup-last-saved status-note mt-4 text-xs leading-5">
                {lastBackupAt ? `Letzte erfolgreiche Sicherung: ${new Date(lastBackupAt).toLocaleString("de-DE")}` : "Noch keine lokale Backup-Datei gespeichert."}
              </p>
            </section>

            <section className="backup-sync-card rounded-2xl border p-4" aria-labelledby="remote-backup-title">
              <div className="flex items-start gap-3">
                <span className="backup-sync-icon" aria-hidden="true"><CloudUploadIcon /></span>
                <div>
                  <p className="backup-action-kicker">Optional · schulisch freigegeben</p>
                  <h3 id="remote-backup-title" className="themed-strong text-base font-semibold">Zusätzliche Ablage</h3>
                  <p className="themed-muted mt-1 text-sm leading-5">EWH legt verschlüsselte Backups lokal ab; der Nextcloud-Desktop-Client synchronisiert sie.</p>
                </div>
              </div>
              {nextcloudFolderSupported ? (
                nextcloudFolderName ? (
                  <div className="mt-4 space-y-2">
                    <p className="backup-connected-folder" title={nextcloudFolderName}>Verbunden: {nextcloudFolderName}</p>
                    <button type="button" className="button-secondary backup-choice-button w-full" onClick={() => setBackupDialog("nextcloud")}>
                      <CloudUploadIcon />
                      In Nextcloud-Ordner sichern
                    </button>
                    <button type="button" className="button-ghost backup-choice-button w-full" onClick={() => { void loadLatestNextcloudBackup(); }}>
                      <UploadIcon />
                      Neuestes Backup öffnen
                    </button>
                    <button type="button" className="button-ghost text-xs" onClick={() => setBackupDialog("nextcloud-connect")}>Ordner ändern</button>
                  </div>
                ) : (
                  <div className="mt-4">
                    <button type="button" className="button-secondary backup-choice-button w-full" onClick={() => setBackupDialog("nextcloud-connect")}>
                      <CloudUploadIcon />
                      Nextcloud-Ordner verbinden
                    </button>
                  </div>
                )
              ) : (
                <div className="mt-4 space-y-2">
                  <button type="button" className="button-secondary backup-choice-button w-full" disabled title="Für eine Ordnerverbindung ist Edge oder Chrome erforderlich.">
                    <CloudUploadIcon />
                    Nextcloud-Ordner verbinden
                  </button>
                  <p className="backup-browser-note text-xs leading-5">In diesem Browser nicht verfügbar. Öffne EWH in Edge oder Chrome, um einen lokalen Nextcloud-Sync-Ordner zu verbinden. Alternativ: lokales Backup speichern und die Datei selbst in den Nextcloud-Ordner legen.</p>
                </div>
              )}
              <p className="backup-remote-note mt-4 text-xs leading-5">Ersetzt kein lokales Backup. EWH speichert keine Nextcloud-Zugangsdaten.</p>
            </section>
          </div>

          {canRollbackImport ? (
            <button type="button" className="button-secondary gap-2" onClick={onRollbackImport}>
              <DuplicateIcon />
              Letzten Import rückgängig
            </button>
          ) : null}

        </div>
      </Card>

      <ConfirmDialog
        open={backupDialog === "save"}
        title="Verschlüsseltes Backup speichern"
        description="Lege ein Passwort für diese Datei fest. Es wird nicht in der App gespeichert und ist für eine spätere Wiederherstellung erforderlich."
        onCancel={() => setBackupDialog(null)}
        onConfirm={() => { void saveFullBackup(); }}
        confirmLabel="Backup speichern"
        confirmDisabled={!fullBackupPassphrase.trim()}
      >
        <div className="space-y-3">
          <PasswordField label="Backup-Passwort" value={fullBackupPassphrase} onChange={setFullBackupPassphrase} placeholder="Passwort festlegen" />
          <p className="text-sm font-medium leading-6 text-amber-700 dark:text-amber-300" role="note">
            Wichtig: Ohne dieses Passwort kann die Backup-Datei nicht wiederhergestellt werden.
          </p>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={backupDialog === "nextcloud-connect"}
        title="Nextcloud-Ordner verbinden"
        description="Wähle einen lokalen Ordner, der bereits vom Nextcloud-Desktop-Client deiner Schule synchronisiert wird."
        onCancel={() => setBackupDialog(null)}
        onConfirm={() => { void connectNextcloudFolder(); }}
        confirmLabel="Ordner auswählen"
        confirmDisabled={!nextcloudAcknowledged}
      >
        <div className="space-y-4">
          <div className="surface-muted rounded-xl border p-4 text-sm leading-6">
            <p className="themed-strong font-semibold">Keine direkte Cloud-Verbindung</p>
            <p className="themed-muted mt-1">EWH erhält keine WebDAV-Adresse, keinen Benutzernamen und kein Passwort. Der auf dem Gerät eingerichtete Nextcloud-Desktop-Client übernimmt später die Synchronisation.</p>
          </div>
          <label className="flex items-start gap-3 text-sm leading-5">
            <input type="checkbox" checked={nextcloudAcknowledged} onChange={(event) => setNextcloudAcknowledged(event.target.checked)} />
            <span>Ich bestätige, dass dieser Nextcloud-Speicherort durch meine Schule bzw. den Schulträger freigegeben ist und weiterhin ein lokales Backup verfügbar bleibt.</span>
          </label>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={backupDialog === "nextcloud"}
        title="Im Nextcloud-Ordner sichern"
        description="EWH legt eine neu erzeugte, lokal verschlüsselte Backup-Datei im verbundenen Ordner ab. Der Nextcloud-Desktop-Client synchronisiert sie anschließend."
        onCancel={() => {
          setBackupDialog(null);
          setNextcloudBackupPassphrase("");
        }}
        onConfirm={() => { void syncNextcloud(); }}
        confirmLabel="Verschlüsseltes Backup ablegen"
        confirmDisabled={!nextcloudBackupPassphrase.trim()}
      >
        <div className="space-y-4">
          <div className="surface-muted rounded-xl border p-4 text-sm leading-6">
            <p className="themed-strong font-semibold">Lokaler Nextcloud-Sync-Ordner</p>
            <p className="themed-muted mt-1">EWH schreibt nur in „{nextcloudFolderName ?? "den verbundenen Ordner"}“. Die Weitergabe an Nextcloud übernimmt ausschließlich der bereits eingerichtete Desktop-Client.</p>
          </div>
          <PasswordField label="Backup-Passwort" value={nextcloudBackupPassphrase} onChange={setNextcloudBackupPassphrase} placeholder="Passwort für diese Sicherung" />
          <p className="themed-muted text-xs leading-5">Die Datei enthält keine Namen im Dateinamen und Zugangsdaten werden nicht abgefragt oder gespeichert.</p>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={backupDialog === "restore"}
        title="Backup wiederherstellen"
        description="Wähle die Backup-Datei und gib ihr Passwort ein. Danach prüfst du den Inhalt, bevor Daten wiederhergestellt werden."
        onCancel={() => setBackupDialog(null)}
        onConfirm={inspectFullBackup}
        confirmLabel="Inhalt prüfen"
        confirmDisabled={!selectedFullBackupFile || !fullBackupPassphrase.trim()}
      >
        <div className="space-y-4">
          <div>
            <p className="label">Backup-Datei</p>
            <label className="button-secondary w-full cursor-pointer justify-start gap-2">
              <UploadIcon />
              {selectedFullBackupFile ? selectedFullBackupFile.name : "Backup-Datei auswählen"}
              <input type="file" accept="application/json" className="hidden" onChange={selectFullBackupFile} />
            </label>
          </div>
          <PasswordField label="Passwort dieser Backup-Datei" value={fullBackupPassphrase} onChange={setFullBackupPassphrase} placeholder="Passwort eingeben" />
          <p className="text-sm leading-6" role="note">Das Passwort muss mit dem beim Speichern verwendeten Passwort übereinstimmen.</p>
        </div>
      </ConfirmDialog>

    </div>
  );
};
