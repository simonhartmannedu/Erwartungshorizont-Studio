import { ChangeEvent, useState } from "react";
import { ArchiveIcon, DownloadIcon, DuplicateIcon, PlusIcon, UploadIcon } from "./icons";
import { ConfirmDialog } from "./ConfirmDialog";
import { Badge, Card, DismissibleCallout, Field } from "./ui";

export interface SchoolYearBackupOption {
  value: string;
  label: string;
  workspaceCount: number;
  snapshotCount: number;
  assessmentCount: number;
}

interface Props {
  backupStatus: {
    tone: "info" | "warning" | "success" | "danger";
    summary: string;
    detail: string;
  };
  lastBackupAt: string | null;
  schoolYearOptions: SchoolYearBackupOption[];
  canRollbackImport: boolean;
  onExportFullBackup: (passphrase: string) => Promise<boolean>;
  onImportBackup: (file: File, passphrase: string) => void;
  onRollbackImport: () => void;
  onArchiveSchoolYear: (schoolYear: string, passphrase: string) => Promise<boolean>;
  onStartSchoolYear: (schoolYear: string, studentListMode: "keep" | "delete") => void;
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
  schoolYearOptions,
  canRollbackImport,
  onExportFullBackup,
  onImportBackup,
  onRollbackImport,
  onArchiveSchoolYear,
  onStartSchoolYear,
}: Props) => {
  const [backupDialog, setBackupDialog] = useState<"save" | "restore" | "archive-school-year" | null>(null);
  const [fullBackupPassphrase, setFullBackupPassphrase] = useState("");
  const [selectedFullBackupFile, setSelectedFullBackupFile] = useState<File | null>(null);
  const [schoolYearPassphrase, setSchoolYearPassphrase] = useState("");
  const [schoolYearRestorePassphrase, setSchoolYearRestorePassphrase] = useState("");
  const [selectedSchoolYearRestoreFile, setSelectedSchoolYearRestoreFile] = useState<File | null>(null);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState(schoolYearOptions[0]?.value ?? "");
  const [newSchoolYear, setNewSchoolYear] = useState("");
  const [studentListMode, setStudentListMode] = useState<"keep" | "delete">("keep");
  const [deleteStudentListsConfirmed, setDeleteStudentListsConfirmed] = useState(false);

  const effectiveSchoolYear = schoolYearOptions.some((option) => option.value === selectedSchoolYear)
    ? selectedSchoolYear
    : schoolYearOptions[0]?.value ?? "";
  const selectedOption = schoolYearOptions.find((option) => option.value === effectiveSchoolYear) ?? null;

  const selectFullBackupFile = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedFullBackupFile(event.target.files?.[0] ?? null);
    event.target.value = "";
  };

  const selectSchoolYearArchive = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedSchoolYearRestoreFile(event.target.files?.[0] ?? null);
    event.target.value = "";
  };

  const startNewSchoolYear = () => {
    if (studentListMode === "delete" && !deleteStudentListsConfirmed) return;
    onStartSchoolYear(newSchoolYear, studentListMode);
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

  const archiveSchoolYear = async () => {
    const archived = await onArchiveSchoolYear(effectiveSchoolYear, schoolYearPassphrase);
    if (archived) {
      setBackupDialog(null);
      setSchoolYearPassphrase("");
    }
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

      <Card title="Sicherungen" subtitle="Erstelle regelmäßig eine verschlüsselte Datei oder stelle eine vorhandene Datei wieder her.">
        <div className="space-y-4">
          <DismissibleCallout tone={backupStatus.tone} resetKey={`${backupStatus.summary}-${lastBackupAt ?? "none"}`}>
            <p className="font-semibold">{backupStatus.summary}</p>
            <p>{backupStatus.detail}</p>
          </DismissibleCallout>

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              className="button-primary backup-choice-button w-full"
              onClick={() => setBackupDialog("save")}
            >
              <DownloadIcon />
              Backup speichern
            </button>
            <button
              type="button"
              className="button-secondary backup-choice-button w-full"
              onClick={() => setBackupDialog("restore")}
            >
              <UploadIcon />
              Backup wiederherstellen
            </button>
          </div>

          {canRollbackImport ? (
            <button type="button" className="button-secondary gap-2" onClick={onRollbackImport}>
              <DuplicateIcon />
              Letzten Import rückgängig
            </button>
          ) : null}

          <p className="status-note text-xs leading-5">
            {lastBackupAt ? `Letzte erfolgreiche Sicherung: ${new Date(lastBackupAt).toLocaleString("de-DE")}` : "Noch keine Backup-Datei gespeichert."}
          </p>
        </div>
      </Card>

      <Card title="Schuljahr verwalten" subtitle="Starte ein neues Schuljahr, archiviere abgeschlossene Arbeit oder stelle ein Archiv zurück.">
        <div className="grid gap-4 xl:grid-cols-3">
          <section className="backup-action-card backup-action-card-restore rounded-2xl border p-4">
            <span className="backup-action-icon"><PlusIcon /></span>
            <h3 className="themed-strong mt-4 text-base font-semibold">Neues Schuljahr starten</h3>
            <p className="themed-muted mt-1 text-sm leading-6">Lege die Bezeichnung fest und entscheide, ob vorhandene Listen weiterverwendet werden.</p>
            <div className="mt-4 space-y-4">
              <Field label="Neues Schuljahr">
                <input className="field" value={newSchoolYear} placeholder="z. B. 2026/27" onChange={(event) => setNewSchoolYear(event.target.value)} />
              </Field>
              <Field as="div" label="Schülerlisten">
                <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition-colors ${studentListMode === "keep" ? "border-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-950/20" : "border-rose-500/40 bg-rose-50/60 dark:bg-rose-950/20"}`}>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={studentListMode === "keep"}
                    onChange={(event) => {
                      setStudentListMode(event.target.checked ? "keep" : "delete");
                      if (event.target.checked) setDeleteStudentListsConfirmed(false);
                    }}
                  />
                  <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${studentListMode === "keep" ? "bg-emerald-600" : "bg-rose-600"}`} aria-hidden="true">
                    <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${studentListMode === "keep" ? "translate-x-6" : "translate-x-1"}`} />
                  </span>
                  <span>
                    <span className="themed-strong block text-sm font-semibold">{studentListMode === "keep" ? "Listen behalten" : "Listen löschen"}</span>
                    <span className="themed-muted block text-xs leading-5">{studentListMode === "keep" ? "Bestehende Lerngruppen und Bewertungen bleiben verfügbar." : "Lerngruppen und Bewertungen werden aus diesem Browser entfernt."}</span>
                  </span>
                </label>
              </Field>
              {studentListMode === "delete" ? (
                <label className="flex items-start gap-3 text-sm leading-5">
                  <input type="checkbox" checked={deleteStudentListsConfirmed} onChange={(event) => setDeleteStudentListsConfirmed(event.target.checked)} />
                  <span>Ich verstehe, dass Lerngruppen und Bewertungen aus diesem Browser entfernt werden.</span>
                </label>
              ) : null}
              <button type="button" className="button-primary w-full gap-2" disabled={studentListMode === "delete" && !deleteStudentListsConfirmed} onClick={startNewSchoolYear}>
                <PlusIcon />
                Schuljahr anlegen
              </button>
            </div>
          </section>

          <section className="backup-action-card backup-action-card-save rounded-2xl border p-4">
            <span className="backup-action-icon"><ArchiveIcon /></span>
            <h3 className="themed-strong mt-4 text-base font-semibold">Schuljahr archivieren</h3>
            {selectedOption ? (
              <div className="mt-4 space-y-4">
                <Field label="Abgeschlossenes Schuljahr">
                  <select className="field" value={effectiveSchoolYear} onChange={(event) => setSelectedSchoolYear(event.target.value)}>
                    {schoolYearOptions.map((option) => <option key={option.value || "empty-school-year"} value={option.value}>{option.label}</option>)}
                  </select>
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="slate">{selectedOption.workspaceCount} Klassenarbeiten</Badge>
                  <Badge tone="slate">{selectedOption.snapshotCount} EWH-Versionen</Badge>
                  <Badge tone="slate">{selectedOption.assessmentCount} Bewertungen</Badge>
                </div>
                <button type="button" className="button-primary w-full gap-2" onClick={() => setBackupDialog("archive-school-year")}>
                  <DownloadIcon />
                  Archivieren und ausblenden
                </button>
                <p className="status-note text-xs leading-5">Nach erfolgreichem Speichern verschwindet das Schuljahr aus der Arbeitsliste.</p>
              </div>
            ) : <p className="status-note mt-3 text-sm leading-6">Es gibt noch keine Klassenarbeiten, die archiviert werden können.</p>}
          </section>

          <section className="backup-action-card backup-action-card-restore rounded-2xl border p-4">
            <span className="backup-action-icon"><UploadIcon /></span>
            <h3 className="themed-strong mt-4 text-base font-semibold">Schuljahr wiederherstellen</h3>
            <p className="themed-muted mt-1 text-sm leading-6">Wähle eine Archivdatei; anschließend prüfst du ihren Inhalt vor dem Wiederherstellen.</p>
            {!selectedSchoolYearRestoreFile ? (
              <label className="button-primary mt-4 w-full cursor-pointer gap-2">
                <UploadIcon />
                Schuljahr-Archiv auswählen
                <input type="file" accept="application/json" className="hidden" onChange={selectSchoolYearArchive} />
              </label>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="surface-muted rounded-2xl border p-3 text-sm">
                  <p className="label">Ausgewählte Datei</p>
                  <p className="themed-strong font-medium">{selectedSchoolYearRestoreFile.name}</p>
                </div>
                <PasswordField label="Passwort dieser Archivdatei" value={schoolYearRestorePassphrase} onChange={setSchoolYearRestorePassphrase} placeholder="Passwort eingeben" />
                <button type="button" className="button-primary w-full gap-2" disabled={!schoolYearRestorePassphrase.trim()} onClick={() => onImportBackup(selectedSchoolYearRestoreFile, schoolYearRestorePassphrase)}>
                  <ArchiveIcon />
                  Inhalt prüfen
                </button>
                <label className="button-secondary w-full cursor-pointer gap-2">
                  Andere Datei auswählen
                  <input type="file" accept="application/json" className="hidden" onChange={selectSchoolYearArchive} />
                </label>
              </div>
            )}
          </section>
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

      <ConfirmDialog
        open={backupDialog === "archive-school-year"}
        title="Schuljahr archivieren"
        description={`Die Archivdatei enthält ${selectedOption?.workspaceCount ?? 0} Klassenarbeiten aus ${selectedOption?.label ?? "dem ausgewählten Schuljahr"}. Nach dem erfolgreichen Speichern wird dieses Schuljahr aus der laufenden Arbeitsliste ausgeblendet.`}
        onCancel={() => setBackupDialog(null)}
        onConfirm={() => { void archiveSchoolYear(); }}
        confirmLabel="Archivieren und ausblenden"
        confirmDisabled={!schoolYearPassphrase.trim()}
      >
        <div className="space-y-3">
          <PasswordField label="Passwort für die Archivdatei" value={schoolYearPassphrase} onChange={setSchoolYearPassphrase} placeholder="Passwort festlegen" />
          <p className="text-sm font-medium leading-6 text-amber-700 dark:text-amber-300" role="note">
            Wichtig: Ohne dieses Passwort kann das Schuljahr später nicht wiederhergestellt werden.
          </p>
        </div>
      </ConfirmDialog>
    </div>
  );
};
