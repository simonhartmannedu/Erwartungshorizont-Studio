import { ChangeEvent, useState } from "react";
import { DownloadIcon, ReportIcon, UploadIcon } from "./icons";
import { Card, Field } from "./ui";

interface Props {
  onPrint: () => void;
  onPrintWithoutDetails: () => void;
  onPrintGradeScale?: () => void;
  onPrintClass?: () => void;
  onPrintClassOverview?: () => void;
  onPrintGradeList?: () => void;
  onImportBackup?: (file: File, passphrase: string) => void;
  onExportBackup?: (passphrase: string) => Promise<boolean>;
  onExportDocx?: () => void;
  onExportClassDocx?: () => void;
  onExportClassOverviewDocx?: () => void;
  onExportGradeListDocx?: () => void;
  onExportGradeListCsv?: () => void;
  onExportEmptyDocx?: () => void;
  onExportGradeScaleDocx?: () => void;
  printLabel?: string;
  printWithoutDetailsLabel?: string;
  printGradeScaleLabel?: string;
  classPrintLabel?: string;
  classOverviewPrintLabel?: string;
  gradeListLabel?: string;
  printHint?: string;
  simpleEwhExport?: boolean;
}

interface DocumentOutput {
  value: string;
  label: string;
  action: () => void;
  docxAction?: () => void;
  csvAction?: () => void;
}

export const ImportExportControls = ({
  onImportBackup,
  onExportBackup,
  onExportDocx,
  onExportClassDocx,
  onExportClassOverviewDocx,
  onExportGradeListDocx,
  onExportGradeListCsv,
  onExportEmptyDocx,
  onExportGradeScaleDocx,
  onPrint,
  onPrintWithoutDetails,
  onPrintGradeScale,
  onPrintClass,
  onPrintClassOverview,
  onPrintGradeList,
  printLabel,
  printWithoutDetailsLabel,
  printGradeScaleLabel,
  classPrintLabel,
  classOverviewPrintLabel,
  gradeListLabel,
  printHint,
  simpleEwhExport = false,
}: Props) => {
  const [backupPassphrase, setBackupPassphrase] = useState("");
  const [selectedDocumentOutput, setSelectedDocumentOutput] = useState<string | null>(null);

  const documentOutputs: DocumentOutput[] = simpleEwhExport ? [
    { value: "ewh", label: "Fertiger EWH", action: onPrintWithoutDetails, docxAction: onExportEmptyDocx },
  ] : [
    { value: "current", label: printLabel || "Aktueller Bewertungsbogen", action: onPrint, docxAction: onExportDocx },
    ...(onPrintClass ? [{ value: "class", label: classPrintLabel || "Klassenbögen", action: onPrintClass, docxAction: onExportClassDocx }] : []),
    ...(onPrintClassOverview ? [{ value: "overview", label: classOverviewPrintLabel || "Klassenübersicht", action: onPrintClassOverview, docxAction: onExportClassOverviewDocx }] : []),
    ...(onPrintGradeList ? [{ value: "grade-list", label: gradeListLabel || "Notenliste", action: onPrintGradeList, docxAction: onExportGradeListDocx, csvAction: onExportGradeListCsv }] : []),
    { value: "empty", label: printWithoutDetailsLabel || "Leerer EWH", action: onPrintWithoutDetails, docxAction: onExportEmptyDocx },
    ...(onPrintGradeScale ? [{ value: "grade-scale", label: printGradeScaleLabel || "Notenbereiche", action: onPrintGradeScale, docxAction: onExportGradeScaleDocx }] : []),
  ];
  const selectedDocumentOutputConfig = documentOutputs.find((output) => output.value === selectedDocumentOutput) ?? null;
  const showBackupControls = Boolean(onImportBackup && onExportBackup);


  const handleBackupImport = (event: ChangeEvent<HTMLInputElement>) => {
    if (!onImportBackup) return;
    const file = event.target.files?.[0];
    if (!file) return;
    onImportBackup(file, backupPassphrase);
    event.target.value = "";
  };

  return (
    <Card title="Drucken und exportieren" subtitle={printHint}>
      <div className="space-y-4">
        <div className="surface-muted rounded-2xl p-4">
          <p className="label">Dokumentausgabe</p>
          <p className="themed-muted mt-1 text-sm">Wähle zuerst den Inhalt. Danach erscheinen die verfügbaren Formate.</p>
          <div className="export-choice-list mt-3" role="group" aria-label="Dokumentausgabe wählen">
            {documentOutputs.map((output) => (
              <button
                key={output.value}
                type="button"
                className={`export-choice ${selectedDocumentOutput === output.value ? "export-choice-active" : ""}`}
                aria-pressed={selectedDocumentOutput === output.value}
                onClick={() => setSelectedDocumentOutput(output.value)}
              >
                <ReportIcon />
                {output.label}
              </button>
            ))}
          </div>
          {selectedDocumentOutputConfig ? (
            <div className="export-format-row mt-4">
              <div>
                <p className="label">Format für „{selectedDocumentOutputConfig.label}“</p>
                <p className="themed-muted text-sm">Wähle eine Ausgabe, um die Datei zu erstellen.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="button-primary gap-2" onClick={selectedDocumentOutputConfig.action}>
                  <ReportIcon />
                  Druck-PDF
                </button>
                {selectedDocumentOutputConfig.docxAction ? (
                  <button type="button" className="button-secondary gap-2" onClick={selectedDocumentOutputConfig.docxAction}>
                    <DownloadIcon />
                    Word (.docx)
                  </button>
                ) : null}
                {selectedDocumentOutputConfig.csvAction ? (
                  <button type="button" className="button-secondary gap-2" onClick={selectedDocumentOutputConfig.csvAction}>
                    <DownloadIcon />
                    CSV
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
        {showBackupControls ? (
          <div className="surface-elevated rounded-2xl border p-4">
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
                    void onExportBackup?.(backupPassphrase);
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
        ) : null}
      </div>
    </Card>
  );
};
