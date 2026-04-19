import { ChangeEvent, useState } from "react";
import { DownloadIcon, ReportIcon, UploadIcon } from "./icons";
import { Card, Field } from "./ui";

interface Props {
  onPrint: () => void;
  onPrintWithoutDetails: () => void;
  onPrintGradeScale?: () => void;
  onPrintClass?: () => void;
  onPrintClassOverview?: () => void;
  onImportBackup: (file: File, passphrase: string) => void;
  onExportBackup: (passphrase: string) => Promise<boolean>;
  printLabel?: string;
  printWithoutDetailsLabel?: string;
  printGradeScaleLabel?: string;
  classPrintLabel?: string;
  classOverviewPrintLabel?: string;
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
  printLabel,
  printWithoutDetailsLabel,
  printGradeScaleLabel,
  classPrintLabel,
  classOverviewPrintLabel,
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
    <Card title="Drucken / Import / Export" subtitle={printHint}>
      <div className="space-y-4">
        <div className="surface-muted rounded-3xl p-4">
          <p className="label">Drucken</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" className="button-primary gap-2" onClick={onPrint}>
              <ReportIcon />
              {printLabel || "PDF / Drucken"}
            </button>
            <button type="button" className="button-secondary gap-2" onClick={onPrintWithoutDetails}>
              <ReportIcon />
              {printWithoutDetailsLabel || "Ohne Note / Kommentar / Signatur"}
            </button>
            {onPrintGradeScale && (
              <button type="button" className="button-secondary gap-2" onClick={onPrintGradeScale}>
                <ReportIcon />
                {printGradeScaleLabel || "Notenbereiche als PDF"}
              </button>
            )}
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
                Arbeitsstand-Backup exportieren
              </button>
              <label className="button-secondary cursor-pointer gap-2">
                <UploadIcon />
                Arbeitsstand-Backup importieren
                <input type="file" accept="application/json" className="hidden" onChange={handleBackupImport} />
              </label>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
