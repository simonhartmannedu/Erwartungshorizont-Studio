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
  onExportDocx?: () => void;
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
  onExportDocx,
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
  const [selectedDocumentOutput, setSelectedDocumentOutput] = useState<string | null>(null);
  const [selectedTableOutputValue, setSelectedTableOutputValue] = useState<string | null>(null);

  const pdfOutputs = [
    { value: "current", label: printLabel || "Aktueller Bewertungsbogen", action: onPrint },
    ...(onPrintClass ? [{ value: "class", label: classPrintLabel || "Klassenbögen", action: onPrintClass }] : []),
    ...(onPrintClassOverview ? [{ value: "overview", label: classOverviewPrintLabel || "Klassenübersicht", action: onPrintClassOverview }] : []),
    { value: "empty", label: printWithoutDetailsLabel || "Leerer EWH", action: onPrintWithoutDetails },
    ...(onPrintGradeScale ? [{ value: "grade-scale", label: printGradeScaleLabel || "Notenbereiche", action: onPrintGradeScale }] : []),
  ];
  const selectedPdfOutput = pdfOutputs.find((output) => output.value === selectedDocumentOutput) ?? null;
  const tableOutputs = [
    { value: "scoring", label: "Punktetabelle", formats: [
      ...(onExportScoringOds ? [{ value: "ods", label: exportScoringOdsLabel || "ODS", action: onExportScoringOds }] : []),
      ...(onExportScoringXlsx ? [{ value: "xlsx", label: exportScoringXlsxLabel || "Excel (.xlsx)", action: onExportScoringXlsx }] : []),
      ...(onExportScoringCsv ? [{ value: "csv", label: exportScoringCsvLabel || "CSV", action: onExportScoringCsv }] : []),
    ] },
    ...(onExportCsvStudent ? [{ value: "students", label: exportCsvStudentLabel || "Schülerdaten", formats: [{ value: "csv", label: "CSV", action: onExportCsvStudent }] }] : []),
    ...(onExportCsvClass ? [{ value: "class", label: exportCsvClassLabel || "Klassendaten", formats: [{ value: "csv", label: "CSV", action: onExportCsvClass }] }] : []),
    ...(onExportCsvClassOverview ? [{ value: "overview", label: exportCsvClassOverviewLabel || "Klassenübersicht", formats: [{ value: "csv", label: "CSV", action: onExportCsvClassOverview }] }] : []),
    ...(onExportCsvGradeScale ? [{ value: "grade-scale", label: exportCsvGradeScaleLabel || "Notenbereiche", formats: [{ value: "csv", label: "CSV", action: onExportCsvGradeScale }] }] : []),
  ].filter((output) => output.formats.length > 0);
  const selectedTableOutput = tableOutputs.find((output) => output.value === selectedTableOutputValue) ?? null;

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
          <p className="label">Dokumentausgabe</p>
          <p className="themed-muted mt-1 text-sm">Wähle zuerst den Inhalt. Danach erscheinen die verfügbaren Formate.</p>
          <div className="export-choice-list mt-3" role="group" aria-label="Dokumentausgabe wählen">
            {pdfOutputs.map((output) => <button key={output.value} type="button" className={`export-choice ${selectedDocumentOutput === output.value ? "export-choice-active" : ""}`} aria-pressed={selectedDocumentOutput === output.value} onClick={() => setSelectedDocumentOutput(output.value)}><ReportIcon />{output.label}</button>)}
          </div>
          {selectedPdfOutput ? <div className="export-format-row mt-4"><div><p className="label">Format für „{selectedPdfOutput.label}“</p><p className="themed-muted text-sm">Wähle eine Ausgabe, um die Datei zu erstellen.</p></div><div className="flex flex-wrap gap-2"><button type="button" className="button-primary gap-2" onClick={selectedPdfOutput.action}><ReportIcon />Druck-PDF</button>{selectedPdfOutput.value === "current" && onExportDocx ? <button type="button" className="button-secondary gap-2" onClick={onExportDocx}><DownloadIcon />Word (.docx)</button> : null}</div></div> : null}
        </div>
        <div className="surface-muted rounded-3xl p-4">
          <p className="label">Tabellenexport</p>
          <p className="themed-muted mt-1 text-sm">Wähle zuerst den Tabelleninhalt. Danach erscheinen die passenden Formate.</p>
          <div className="export-choice-list mt-3" role="group" aria-label="Tabelleninhalt wählen">
            {tableOutputs.map((output) => <button key={output.value} type="button" className={`export-choice ${selectedTableOutputValue === output.value ? "export-choice-active" : ""}`} aria-pressed={selectedTableOutputValue === output.value} onClick={() => setSelectedTableOutputValue(output.value)}><DownloadIcon />{output.label}</button>)}
          </div>
          {selectedTableOutput ? <div className="export-format-row mt-4"><div><p className="label">Format für „{selectedTableOutput.label}“</p><p className="themed-muted text-sm">Wähle ein Format, um die Datei zu erstellen.</p></div><div className="flex flex-wrap gap-2">{selectedTableOutput.formats.map((format) => <button key={format.value} type="button" className={format.value === "ods" ? "button-primary gap-2" : "button-secondary gap-2"} onClick={format.action}><DownloadIcon />{format.label}</button>)}</div></div> : null}
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
