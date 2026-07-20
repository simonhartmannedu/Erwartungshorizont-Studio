import { ChangeEvent, useState } from "react";
import { DownloadIcon, ReportIcon, UploadIcon } from "./icons";
import { Card, Field } from "./ui";

interface Props {
  onPrint: () => void;
  onPrintWithoutDetails: () => void;
  onPrintGradeScale?: () => void;
  onPrintClass?: () => void;
  onPrintClassOverview?: () => void;
  onExportCsvStudent?: () => void;
  onExportCsvClass?: () => void;
  onExportCsvClassOverview?: () => void;
  onExportCsvGradeScale?: () => void;
  onExportScoringCsv?: () => void;
  onExportScoringOds?: () => void;
  onExportScoringXlsx?: () => void;
  onImportBackup: (file: File, passphrase: string) => void;
  onExportBackup: (passphrase: string) => Promise<boolean>;
  printLabel?: string;
  printWithoutDetailsLabel?: string;
  printGradeScaleLabel?: string;
  classPrintLabel?: string;
  classOverviewPrintLabel?: string;
  exportCsvStudentLabel?: string;
  exportCsvClassLabel?: string;
  exportCsvClassOverviewLabel?: string;
  exportCsvGradeScaleLabel?: string;
  exportScoringCsvLabel?: string;
  exportScoringOdsLabel?: string;
  exportScoringXlsxLabel?: string;
  printHint?: string;
}

export const ImportExportControls = ({
  onImportBackup,
  onExportBackup,
  onPrint,
  onPrintWithoutDetails,
  onPrintGradeScale,
  onPrintClass,
  onPrintClassOverview,
  onExportCsvStudent,
  onExportCsvClass,
  onExportCsvClassOverview,
  onExportCsvGradeScale,
  onExportScoringCsv,
  onExportScoringOds,
  onExportScoringXlsx,
  printLabel,
  printWithoutDetailsLabel,
  printGradeScaleLabel,
  classPrintLabel,
  classOverviewPrintLabel,
  exportCsvStudentLabel,
  exportCsvClassLabel,
  exportCsvClassOverviewLabel,
  exportCsvGradeScaleLabel,
  exportScoringCsvLabel,
  exportScoringOdsLabel,
  exportScoringXlsxLabel,
  printHint,
}: Props) => {
  const [backupPassphrase, setBackupPassphrase] = useState("");

  const handleBackupImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    onImportBackup(file, backupPassphrase);
    event.target.value = "";
  };

  return (
    <Card title="Drucken und exportieren" subtitle={printHint}>
      <div className="space-y-4">
        <div className="surface-muted rounded-3xl p-4">
          <p className="label">PDF / Druck</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" className="button-primary gap-2" onClick={onPrint}>
              <ReportIcon />
              {printLabel || "PDF / Drucken"}
            </button>
            {onPrintClass && (
              <button type="button" className="button-secondary gap-2" onClick={onPrintClass}>
                <ReportIcon />
                {classPrintLabel || "Klasse als PDF"}
              </button>
            )}
            {onPrintClassOverview && (
              <button type="button" className="button-secondary gap-2" onClick={onPrintClassOverview}>
                <ReportIcon />
                {classOverviewPrintLabel || "Klassenübersicht als PDF"}
              </button>
            )}
            <button type="button" className="button-secondary gap-2" onClick={onPrintWithoutDetails}>
              <ReportIcon />
              {printWithoutDetailsLabel || "Leerer EWH"}
            </button>
            {onPrintGradeScale && (
              <button type="button" className="button-secondary gap-2" onClick={onPrintGradeScale}>
                <ReportIcon />
                {printGradeScaleLabel || "Notenbereiche als PDF"}
              </button>
            )}
          </div>
        </div>
        <div className="surface-muted rounded-3xl p-4">
          <p className="label">Tabellenexport</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {onExportScoringOds && (
              <button type="button" className="button-primary gap-2" onClick={onExportScoringOds}>
                <DownloadIcon />
                {exportScoringOdsLabel || "Punktetabelle als ODS"}
              </button>
            )}
            {onExportScoringXlsx && (
              <button type="button" className="button-secondary gap-2" onClick={onExportScoringXlsx}>
                <DownloadIcon />
                {exportScoringXlsxLabel || "Punktetabelle als XLSX"}
              </button>
            )}
            {onExportScoringCsv && (
              <button type="button" className="button-secondary gap-2" onClick={onExportScoringCsv}>
                <DownloadIcon />
                {exportScoringCsvLabel || "Punktetabelle als CSV"}
              </button>
            )}
            {onExportCsvStudent && (
              <button type="button" className="button-secondary gap-2" onClick={onExportCsvStudent}>
                <DownloadIcon />
                {exportCsvStudentLabel || "SuS als CSV"}
              </button>
            )}
            {onExportCsvClass && (
              <button type="button" className="button-secondary gap-2" onClick={onExportCsvClass}>
                <DownloadIcon />
                {exportCsvClassLabel || "Klasse als CSV"}
              </button>
            )}
            {onExportCsvClassOverview && (
              <button type="button" className="button-secondary gap-2" onClick={onExportCsvClassOverview}>
                <DownloadIcon />
                {exportCsvClassOverviewLabel || "Klassenübersicht als CSV"}
              </button>
            )}
            {onExportCsvGradeScale && (
              <button type="button" className="button-secondary gap-2" onClick={onExportCsvGradeScale}>
                <DownloadIcon />
                {exportCsvGradeScaleLabel || "Notenbereiche als CSV"}
              </button>
            )}
          </div>
        </div>
        <div className="surface-elevated rounded-3xl border p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
            <div className="min-w-0 flex-1">
              <Field label="Backup-Passwort">
                <input
                  className="field"
                  type="password"
                  value={backupPassphrase}
                  placeholder="Backup-Passwort"
                  onChange={(event) => setBackupPassphrase(event.target.value)}
                />
              </Field>
            </div>
            <div className="flex flex-wrap gap-3 xl:flex-none">
              <button
                type="button"
                className="button-primary gap-2"
                onClick={() => {
                  void onExportBackup(backupPassphrase);
                }}
              >
                <DownloadIcon />
                Speicherort wählen und Backup sichern
              </button>
              <label className="button-secondary cursor-pointer gap-2">
                <UploadIcon />
                Arbeitsstand-Backup importieren
                <input type="file" accept="application/json" className="hidden" onChange={handleBackupImport} />
              </label>
            </div>
          </div>
          <p className="status-note mt-3 text-xs leading-5">
            In Chromium-basierten Browsern öffnet sich ein Systemdialog zur Ordnerwahl. Andere Browser nutzen den normalen Download-Dialog.
          </p>
        </div>
      </div>
    </Card>
  );
};
