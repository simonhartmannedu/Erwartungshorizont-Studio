import { ChangeEvent, useState } from "react";
import { ArchiveIcon, DownloadIcon, DuplicateIcon, GroupIcon, PlusIcon, SaveIcon, TrashIcon, UploadIcon } from "./icons";
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
        title="Speichern verstehen"
        subtitle="Drei Ebenen mit unterschiedlichen Aufgaben – sie ergänzen sich, ersetzen sich aber nicht."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="backup-level-card surface-elevated rounded-3xl border p-4">
            <span className="backup-level-icon backup-level-icon-auto"><SaveIcon /></span>
            <p className="label mt-4">1. Automatisch speichern</p>
            <p className="themed-strong mt-2 text-base font-semibold">Während der Arbeit</p>
            <p className="themed-muted mt-2 text-sm leading-6">
              Änderungen an Klassenarbeiten und Schülerergebnissen werden direkt in diesem Browser gespeichert. Du musst dafür nichts anklicken.
            </p>
            <p className="status-note mt-3 text-xs leading-5">Gut für: normales Weiterarbeiten. Nicht genug bei Gerätewechsel, Browserbereinigung oder Verlust des Geräts.</p>
          </div>
          <div className="backup-level-card surface-elevated rounded-3xl border p-4">
            <span className="backup-level-icon backup-level-icon-version"><DuplicateIcon /></span>
            <p className="label mt-4">2. EWH-Version</p>
            <p className="themed-strong mt-2 text-base font-semibold">Vor größeren Änderungen</p>
            <p className="themed-muted mt-2 text-sm leading-6">
              Eine EWH-Version bewahrt einen früheren Stand des Erwartungshorizonts, zum Beispiel vor dem Umbau von Aufgaben oder Notenschlüssel.
            </p>
            <p className="status-note mt-3 text-xs leading-5">Gut für: „Ich möchte diese Änderung zurücknehmen.“ Enthält keine Schülerpunkte und bleibt nur in diesem Browser.</p>
          </div>
          <div className="backup-level-card surface-elevated rounded-3xl border p-4">
            <span className="backup-level-icon backup-level-icon-backup"><DownloadIcon /></span>
            <p className="label mt-4">3. Verschlüsseltes Vollbackup</p>
            <p className="themed-strong mt-2 text-base font-semibold">Regelmäßig und vor Risiken</p>
            <p className="themed-muted mt-2 text-sm leading-6">
              Eine heruntergeladene Datei enthält Klassenarbeiten, EWH-Versionen, Archiv und Schülerdaten. Sie lässt sich später wieder importieren.
            </p>
            <p className="status-note mt-3 text-xs leading-5">Gut für: mindestens wöchentlich, nach abgeschlossener Korrektur sowie vor Browser-/Gerätewechsel.</p>
          </div>
        </div>
      </Card>

      <Card
        title="Backup-Datei sichern oder wiederherstellen"
        subtitle="1. Passwort eingeben. 2. Datei speichern oder eine vorhandene Datei wiederherstellen."
      >
        <div className="space-y-4">
          <DismissibleCallout tone={backupStatus.tone} resetKey={`${backupStatus.summary}-${lastBackupAt ?? "none"}`}>
            <p className="font-semibold">{backupStatus.summary}</p>
            <p>{backupStatus.detail}</p>
          </DismissibleCallout>
          <div className="backup-password-step surface-elevated rounded-3xl border p-4">
            <div className="flex items-start gap-3">
              <span className="backup-level-icon backup-level-icon-password"><ArchiveIcon /></span>
              <div className="min-w-0 flex-1">
                <p className="label">Schritt 1</p>
                <p className="themed-strong text-sm font-semibold">Backup-Passwort festlegen</p>
                <p className="themed-muted mt-1 text-sm leading-6">Du brauchst dasselbe Passwort später auch zum Wiederherstellen.</p>
              </div>
            </div>
            <div className="mt-4">
              <Field label="Backup-Passwort">
                <input
                  className="field"
                  type="password"
                  value={fullBackupPassphrase}
                  placeholder="Passwort für Export und Import"
                  onChange={(event) => setFullBackupPassphrase(event.target.value)}
                />
              </Field>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="backup-action-card backup-action-card-save rounded-3xl border p-5">
              <span className="backup-action-icon"><DownloadIcon /></span>
              <p className="label mt-4">Schritt 2a · Regelmäßig nutzen</p>
              <h3 className="themed-strong text-lg font-semibold">Backup-Datei speichern</h3>
              <p className="themed-muted mt-2 text-sm leading-6">
                Lege eine verschlüsselte Datei auf deinem Rechner, einem USB-Stick oder in deinem sicheren Speicher ab.
              </p>
              <div className="mt-4">
                <button
                  type="button"
                  className="button-primary w-full gap-2 sm:w-auto"
                  onClick={() => {
                    void onExportFullBackup(fullBackupPassphrase);
                  }}
                >
                  <DownloadIcon />
                  Backup-Datei speichern
                </button>
              </div>
              <p className="status-note mt-3 text-xs leading-5">Empfohlen: mindestens wöchentlich und vor einem Geräte- oder Browserwechsel.</p>
            </div>
            <div className="backup-action-card backup-action-card-restore rounded-3xl border p-5">
              <span className="backup-action-icon"><UploadIcon /></span>
              <p className="label mt-4">Schritt 2b · Nur bei Bedarf</p>
              <h3 className="themed-strong text-lg font-semibold">Backup-Datei wiederherstellen</h3>
              <p className="themed-muted mt-2 text-sm leading-6">
                Nutze dies auf einem neuen Gerät oder wenn du einen früher gesicherten Arbeitsstand zurückholen möchtest.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <label className="button-secondary cursor-pointer gap-2">
                  <UploadIcon />
                  Backup-Datei auswählen
                  <input type="file" accept="application/json" className="hidden" onChange={handleImport} />
                </label>
                {canRollbackImport ? (
                  <button type="button" className="button-secondary" onClick={onRollbackImport}>
                    <DuplicateIcon />
                    Letzten Import rückgängig
                  </button>
                ) : null}
              </div>
              <p className="status-note mt-3 text-xs leading-5">Die ausgewählte Datei wird vor dem Wiederherstellen geprüft.</p>
            </div>
          </div>
          <div className="backup-last-saved">
            {lastBackupAt ? (
              <p className="status-note mt-3 text-xs leading-5">
                Letzte erfolgreiche Sicherung: {new Date(lastBackupAt).toLocaleString("de-DE")}
              </p>
            ) : <p className="status-note text-xs leading-5">Noch keine Backup-Datei gespeichert.</p>}
          </div>
        </div>
      </Card>

      <Card
        title="Neues Schuljahr starten"
        subtitle="1. Neues Schuljahr benennen. 2. Entscheiden, was mit den bisherigen Schülerlisten geschehen soll."
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
          <div className="backup-action-card backup-action-card-restore rounded-3xl border p-4">
            <span className="backup-action-icon"><PlusIcon /></span>
            <p className="label mt-4">Schritt 1</p>
            <p className="themed-strong text-base font-semibold">Neues Schuljahr benennen</p>
            <p className="themed-muted mt-2 text-sm leading-6">Die Angabe erscheint künftig in der Schuljahr-Auswahl und trennt die neue Arbeit vom bisherigen Jahr.</p>
            <Field label="Neues Schuljahr">
              <input
                className="field"
                value={newSchoolYear}
                placeholder="z. B. 2026/27"
                onChange={(event) => setNewSchoolYear(event.target.value)}
              />
            </Field>
          </div>
          <div className="backup-action-card backup-action-card-save rounded-3xl border p-4">
            <span className="backup-action-icon"><GroupIcon /></span>
            <p className="label mt-4">Schritt 2</p>
            <p className="themed-strong text-base font-semibold">Schülerlisten erhalten oder löschen</p>
            <p className="themed-muted mt-2 text-sm leading-6">Wähle, ob die vorhandenen Lerngruppen im neuen Schuljahr weiterverwendet oder aus diesem Browserprofil entfernt werden.</p>
            <Field as="div" label="Schülerlisten">
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  className={`${studentListMode === "keep" ? "button-primary" : "button-secondary"} backup-choice-button w-full`}
                  onClick={() => setStudentListMode("keep")}
                >
                  <GroupIcon />
                  Listen behalten
                </button>
                <button
                  type="button"
                  className={`${studentListMode === "delete" ? "button-primary" : "button-secondary"} backup-choice-button w-full`}
                  onClick={() => setStudentListMode("delete")}
                >
                  <TrashIcon />
                  Listen löschen
                </button>
              </div>
            </Field>
            <button
              type="button"
              className="button-primary mt-4 w-full gap-2 sm:w-auto"
              onClick={() => onStartSchoolYear(newSchoolYear, studentListMode)}
            >
              <PlusIcon />
              Schuljahr anlegen
            </button>
            <p className="status-note mt-3 text-xs leading-5">
              Was passiert beim Anlegen: Es wird ein neues Arbeitsjahr geöffnet. Meist richtig: Listen erhalten. Bestehende Klassenarbeiten bleiben über die Schuljahr-Auswahl erreichbar; Listen löschen entfernt Lerngruppen und Bewertungen aus diesem Browserprofil.
            </p>
          </div>
        </div>
      </Card>

      <Card
        title="Schuljahr archivieren"
        subtitle="Für abgeschlossene Schuljahre: Datei sichern, dann die Arbeit aus der laufenden Oberfläche ausblenden."
      >
        {schoolYearOptions.length === 0 ? (
          <p className="status-note text-sm leading-6">Es gibt noch keine Klassenarbeiten, die archiviert werden können.</p>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
            <div className="backup-action-card backup-action-card-restore rounded-3xl border p-4">
              <span className="backup-action-icon"><ArchiveIcon /></span>
              <p className="label mt-4">Schritt 1</p>
              <p className="themed-strong text-base font-semibold">Abgeschlossenes Schuljahr auswählen</p>
              <p className="themed-muted mt-2 text-sm leading-6">Die angezeigten Klassenarbeiten, EWH-Versionen und Bewertungen dieses Schuljahrs werden in die Archivdatei übernommen.</p>
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
                  <Badge tone="slate">{selectedOption.snapshotCount} EWH-Versionen</Badge>
                  <Badge tone="slate">{selectedOption.assessmentCount} Bewertungen</Badge>
                </div>
              ) : null}
            </div>
            <div className="backup-action-card backup-action-card-save rounded-3xl border p-4">
              <span className="backup-action-icon"><DownloadIcon /></span>
              <p className="label mt-4">Schritt 2</p>
              <p className="themed-strong text-base font-semibold">Archivdatei sichern und ausblenden</p>
              <p className="themed-muted mt-2 text-sm leading-6">Nach der Passwort-Eingabe wird eine verschlüsselte Datei gespeichert. Erst danach verschwindet das Schuljahr aus der laufenden Arbeitsliste.</p>
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
                Nutze dies erst nach Schuljahresende. Nach erfolgreichem Speichern verschwindet das ausgewählte Schuljahr aus der Arbeitsliste; bei Abbruch bleibt alles unverändert.
              </p>
            </div>
          </div>
        )}
      </Card>

      <Card
        title="Schuljahr wiederherstellen"
        subtitle="Hole ein zuvor archiviertes Schuljahr zurück, wenn du es wieder bearbeiten oder nachsehen musst."
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
          <div className="backup-action-card backup-action-card-restore rounded-3xl border p-4">
            <span className="backup-action-icon"><ArchiveIcon /></span>
            <p className="label mt-4">Schritt 1</p>
            <p className="themed-strong text-base font-semibold">Passwort der Archivdatei eingeben</p>
            <p className="themed-muted mt-2 text-sm leading-6">Mit diesem Passwort wird die ausgewählte Archivdatei entschlüsselt. Es muss dem Passwort beim Archivieren entsprechen.</p>
            <Field label="Archiv-Passwort">
              <input
                className="field"
                type="password"
                value={schoolYearRestorePassphrase}
                placeholder="Passwort der Schuljahr-Archivdatei"
                onChange={(event) => setSchoolYearRestorePassphrase(event.target.value)}
              />
            </Field>
          </div>
          <div className="backup-action-card backup-action-card-save rounded-3xl border p-4">
            <span className="backup-action-icon"><UploadIcon /></span>
            <p className="label mt-4">Schritt 2</p>
            <p className="themed-strong text-base font-semibold">Archivdatei auswählen</p>
            <p className="themed-muted mt-2 text-sm leading-6">Wähle die zuvor gesicherte Schuljahr-Archivdatei aus. Die enthaltenen Klassenarbeiten erscheinen anschließend wieder in der Arbeitsliste.</p>
            <label className="button-primary mt-4 w-full cursor-pointer gap-2 sm:w-auto">
              <UploadIcon />
              Schuljahr-Archiv auswählen
              <input type="file" accept="application/json" className="hidden" onChange={handleSchoolYearRestore} />
            </label>
          </div>
        </div>
        <p className="status-note mt-3 text-xs leading-5">
          Bereits vorhandene Klassenarbeiten aus derselben Archivdatei werden beim Wiederherstellen übersprungen.
        </p>
      </Card>

      <Card title="EWH-Versionen und Exportdateien" subtitle="Was die Browser-App realistisch verwalten kann.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="backup-action-card backup-action-card-restore rounded-3xl border p-5">
            <span className="backup-action-icon"><DuplicateIcon /></span>
            <p className="label mt-4">Während der Bearbeitung</p>
            <p className="themed-strong text-lg font-semibold">EWH-Version anlegen</p>
            <p className="themed-strong text-2xl font-semibold">{totalSnapshotCount}</p>
            <p className="themed-muted mt-2 text-sm leading-6">
              Öffne bei einer Klassenarbeit „EWH-Verlauf“ und speichere vor größeren Änderungen eine Version. Sie bewahrt den Erwartungshorizont, enthält aber keine Schülerergebnisse.
            </p>
            <p className="status-note mt-3 text-xs leading-5">Was passiert: Die Version bleibt bei dieser Klassenarbeit und wird in Vollbackups sowie Schuljahr-Archiven mitgesichert.</p>
          </div>
          <div className="backup-action-card backup-action-card-save rounded-3xl border p-5">
            <span className="backup-action-icon"><DownloadIcon /></span>
            <p className="label mt-4">Wenn du eine Datei gesichert hast</p>
            <p className="themed-strong text-lg font-semibold">Exportdatei wiederverwenden</p>
            <p className="themed-muted mt-2 text-sm leading-6">
              Gespeicherte Backup-Dateien können nicht automatisch gefunden werden. Wähle sie beim Wiederherstellen selbst über die Dateiauswahl aus.
            </p>
            <p className="status-note mt-3 text-xs leading-5">Was passiert: Die Datei wird geprüft und mit dem passenden Passwort wiederhergestellt. Bereits vorhandene Daten werden dabei nicht unbemerkt überschrieben.</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
