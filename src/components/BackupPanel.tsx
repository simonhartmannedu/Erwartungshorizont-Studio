import { ChangeEvent, useState } from "react";
import { DownloadIcon, UploadIcon } from "./icons";
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
  totalSnapshotCount: number;
  canRollbackImport: boolean;
  onExportFullBackup: (passphrase: string) => Promise<boolean>;
  onImportBackup: (file: File, passphrase: string) => void;
  onRollbackImport: () => void;
  onArchiveSchoolYear: (schoolYear: string, passphrase: string) => Promise<boolean>;
  onStartSchoolYear: (schoolYear: string, studentListMode: "keep" | "delete") => void;
}

export const BackupPanel = ({
  backupStatus,
  lastBackupAt,
  schoolYearOptions,
  totalSnapshotCount,
  canRollbackImport,
  onExportFullBackup,
  onImportBackup,
  onRollbackImport,
  onArchiveSchoolYear,
  onStartSchoolYear,
}: Props) => {
  const [fullBackupPassphrase, setFullBackupPassphrase] = useState("");
  const [schoolYearPassphrase, setSchoolYearPassphrase] = useState("");
  const [schoolYearRestorePassphrase, setSchoolYearRestorePassphrase] = useState("");
  const [selectedSchoolYear, setSelectedSchoolYear] = useState(schoolYearOptions[0]?.value ?? "");
  const [newSchoolYear, setNewSchoolYear] = useState("");
  const [studentListMode, setStudentListMode] = useState<"keep" | "delete">("keep");

  const effectiveSchoolYear = schoolYearOptions.some((option) => option.value === selectedSchoolYear)
    ? selectedSchoolYear
    : schoolYearOptions[0]?.value ?? "";
  const selectedOption = schoolYearOptions.find((option) => option.value === effectiveSchoolYear) ?? null;

  const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    onImportBackup(file, fullBackupPassphrase);
    event.target.value = "";
  };

  const handleSchoolYearRestore = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    onImportBackup(file, schoolYearRestorePassphrase);
    event.target.value = "";
  };

  return (
    <div className="space-y-6 no-print">
      <Card
        title="Backup"
        subtitle="Vollständige Sicherungen, Schuljahr-Archivierung und Wiederherstellung."
      >
        <div className="space-y-4">
          <DismissibleCallout tone={backupStatus.tone} resetKey={`${backupStatus.summary}-${lastBackupAt ?? "none"}`}>
            <p className="font-semibold">{backupStatus.summary}</p>
            <p>{backupStatus.detail}</p>
          </DismissibleCallout>
          <div className="surface-elevated rounded-3xl border p-4">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
              <Field label="Backup-Passwort">
                <input
                  className="field"
                  type="password"
                  value={fullBackupPassphrase}
                  placeholder="Passwort für Export und Import"
                  onChange={(event) => setFullBackupPassphrase(event.target.value)}
                />
              </Field>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  className="button-primary gap-2"
                  onClick={() => {
                    void onExportFullBackup(fullBackupPassphrase);
                  }}
                >
                  <DownloadIcon />
                  Vollbackup speichern
                </button>
                <label className="button-secondary cursor-pointer gap-2">
                  <UploadIcon />
                  Backup importieren
                  <input type="file" accept="application/json" className="hidden" onChange={handleImport} />
                </label>
                {canRollbackImport ? (
                  <button type="button" className="button-secondary" onClick={onRollbackImport}>
                    Letzten Import rückgängig
                  </button>
                ) : null}
              </div>
            </div>
            {lastBackupAt ? (
              <p className="status-note mt-3 text-xs leading-5">
                Letzte erfolgreiche Sicherung: {new Date(lastBackupAt).toLocaleString("de-DE")}
              </p>
            ) : null}
          </div>
        </div>
      </Card>

      <Card
        title="Neues Schuljahr starten"
        subtitle="Legt ein neues Arbeitsjahr an und fragt ausdrücklich, was mit bestehenden Schülerlisten passieren soll."
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
          <div className="surface-elevated rounded-3xl border p-4">
            <Field label="Neues Schuljahr">
              <input
                className="field"
                value={newSchoolYear}
                placeholder="z. B. 2026/27"
                onChange={(event) => setNewSchoolYear(event.target.value)}
              />
            </Field>
          </div>
          <div className="surface-elevated rounded-3xl border p-4">
            <Field as="div" label="Schülerlisten">
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  className={studentListMode === "keep" ? "button-primary w-full" : "button-secondary w-full"}
                  onClick={() => setStudentListMode("keep")}
                >
                  Listen behalten
                </button>
                <button
                  type="button"
                  className={studentListMode === "delete" ? "button-primary w-full" : "button-secondary w-full"}
                  onClick={() => setStudentListMode("delete")}
                >
                  Listen löschen
                </button>
              </div>
            </Field>
            <button
              type="button"
              className="button-primary mt-4 w-full gap-2 sm:w-auto"
              onClick={() => onStartSchoolYear(newSchoolYear, studentListMode)}
            >
              Schuljahr anlegen
            </button>
            <p className="status-note mt-3 text-xs leading-5">
              Bestehende Klassenarbeiten bleiben über die Schuljahr-Auswahl erreichbar. Schülerlisten löschen entfernt Lerngruppen und Bewertungen aus dem aktuellen Browserprofil.
            </p>
          </div>
        </div>
      </Card>

      <Card
        title="Schuljahr archivieren"
        subtitle="Sichert alle Klassenarbeiten eines Schuljahrs samt Schnappschüssen in eine wiederherstellbare Datei und entfernt sie anschließend aus der Arbeitsoberfläche. EWH-Archiv-Einträge bleiben lokal erhalten und werden nicht exportiert."
      >
        {schoolYearOptions.length === 0 ? (
          <p className="status-note text-sm leading-6">Es gibt noch keine Klassenarbeiten, die archiviert werden können.</p>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
            <div className="surface-elevated rounded-3xl border p-4">
              <Field label="Schuljahr">
                <select
                  className="field"
                  value={effectiveSchoolYear}
                  onChange={(event) => setSelectedSchoolYear(event.target.value)}
                >
                  {schoolYearOptions.map((option) => (
                    <option key={option.value || "empty-school-year"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              {selectedOption ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge tone="slate">{selectedOption.workspaceCount} Klassenarbeiten</Badge>
                  <Badge tone="slate">{selectedOption.snapshotCount} Schnappschüsse</Badge>
                  <Badge tone="slate">{selectedOption.assessmentCount} Bewertungen</Badge>
                </div>
              ) : null}
            </div>
            <div className="surface-elevated rounded-3xl border p-4">
              <Field label="Archiv-Passwort">
                <input
                  className="field"
                  type="password"
                  value={schoolYearPassphrase}
                  placeholder="Passwort für die Schuljahr-Archivdatei"
                  onChange={(event) => setSchoolYearPassphrase(event.target.value)}
                />
              </Field>
              <button
                type="button"
                className="button-primary mt-4 w-full gap-2 sm:w-auto"
                disabled={!selectedOption}
                onClick={() => {
                  void onArchiveSchoolYear(effectiveSchoolYear, schoolYearPassphrase);
                }}
              >
                <DownloadIcon />
                Schuljahr sichern und ausblenden
              </button>
              <p className="status-note mt-3 text-xs leading-5">
                Nach erfolgreichem Schreiben der Datei werden die betroffenen Klassenarbeiten aus der aktuellen Arbeitsliste entfernt. Bei Abbruch bleibt alles unverändert.
              </p>
            </div>
          </div>
        )}
      </Card>

      <Card
        title="Schuljahr wiederherstellen"
        subtitle="Importiert eine zuvor exportierte Schuljahr-Archivdatei zurück in die Arbeitsliste, ohne das bestehende EWH-Archiv zu ersetzen."
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <Field label="Archiv-Passwort">
            <input
              className="field"
              type="password"
              value={schoolYearRestorePassphrase}
              placeholder="Passwort der Schuljahr-Archivdatei"
              onChange={(event) => setSchoolYearRestorePassphrase(event.target.value)}
            />
          </Field>
          <label className="button-primary cursor-pointer gap-2">
            <UploadIcon />
            Schuljahr-Archiv importieren
            <input type="file" accept="application/json" className="hidden" onChange={handleSchoolYearRestore} />
          </label>
        </div>
        <p className="status-note mt-3 text-xs leading-5">
          Bereits vorhandene Klassenarbeiten aus derselben Archivdatei werden beim Wiederherstellen übersprungen.
        </p>
      </Card>

      <Card title="Schnappschüsse und Exportdateien" subtitle="Was die Browser-App realistisch verwalten kann.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="surface-elevated rounded-3xl border p-4">
            <p className="label">Schnappschüsse</p>
            <p className="themed-strong text-2xl font-semibold">{totalSnapshotCount}</p>
            <p className="themed-muted mt-2 text-sm leading-6">
              Schnappschüsse hängen an der jeweiligen Klassenarbeit und werden in Vollbackups sowie Schuljahr-Archiven mitgesichert.
            </p>
          </div>
          <div className="surface-elevated rounded-3xl border p-4">
            <p className="label">Exportierte Backups</p>
            <p className="themed-strong text-base font-semibold">Import über Dateiauswahl</p>
            <p className="themed-muted mt-2 text-sm leading-6">
              Bereits gespeicherte Backup-Dateien kann eine Web-App nicht automatisch durchsuchen. Wähle die Datei im Import aus, dann wird sie geprüft und wiederhergestellt.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
