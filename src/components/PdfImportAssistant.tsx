import { ChangeEvent, useMemo, useState } from "react";
import { requestPdfExtraction, requestPdfSuggestion } from "../pdf/client";
import { PDF_IMPORT_NOTICES } from "../pdf/constants";
import { pdfAnswerStyleOptions, pdfAssistanceGoalOptions, pdfDocumentKindOptions, pdfPrivacyModeOptions } from "../pdf/options";
import { buildPdfRiskInspectionText, classifyPdfDataRisks, hasHighRiskFindings, PDF_CONSENT_VERSION, PDF_EXTRACT_PURPOSE, PDF_SUGGEST_PURPOSE, preparePdfRedactedPreview } from "../pdf/privacy";
import { DataRiskFinding, ImportedExamSuggestion, PdfAnswerStyle, PdfAssistanceGoal, PdfDocumentKind, PdfExtractionResult, PdfPrivacyMode, PdfSuggestRequest } from "../pdf/types";
import { Badge, Card, DismissibleCallout } from "./ui";

type ConsentState = {
  accepted: boolean;
  version: string;
  acceptedAt: string | null;
};

const createConsentState = (): ConsentState => ({
  accepted: false,
  version: PDF_CONSENT_VERSION,
  acceptedAt: null,
});

interface Props {
  disabled?: boolean;
  onApplySuggestion: (suggestion: ImportedExamSuggestion) => void;
  embedded?: boolean;
  applyLabel?: string;
}

export const PdfImportAssistant = ({
  disabled = false,
  onApplySuggestion,
  embedded = false,
  applyLabel = "Vorschlag in Formularfelder übernehmen",
}: Props) => {
  const [consent, setConsent] = useState<ConsentState>(() => createConsentState());
  const [filename, setFilename] = useState("");
  const [extraction, setExtraction] = useState<PdfExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingReview, setPendingReview] = useState<{ request: PdfSuggestRequest; findings: DataRiskFinding[] } | null>(null);
  const [suggestion, setSuggestion] = useState<ImportedExamSuggestion | null>(null);
  const [serverWarnings, setServerWarnings] = useState<string[]>([]);
  const [documentKind, setDocumentKind] = useState<PdfDocumentKind>("mixed");
  const [assistanceGoal, setAssistanceGoal] = useState<PdfAssistanceGoal>("combined_focus");
  const [privacyMode, setPrivacyMode] = useState<PdfPrivacyMode>("minimize_strictly");
  const [answerStyle, setAnswerStyle] = useState<PdfAnswerStyle>("balanced");

  const extractionFindings = useMemo(
    () => classifyPdfDataRisks(extraction?.text ?? ""),
    [extraction?.text],
  );

  const previewText = useMemo(
    () => (extraction ? preparePdfRedactedPreview(extraction.text).slice(0, 2400) : ""),
    [extraction],
  );

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setError(null);
    setSuggestion(null);
    setServerWarnings([]);
    setPendingReview(null);

    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setFilename(file.name);
      setExtraction(null);
      setError("Bitte eine PDF-Datei auswählen.");
      return;
    }

    try {
      setFilename(file.name);
      setLoading(true);
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (const byte of bytes) {
        binary += String.fromCharCode(byte);
      }
      const base64 = btoa(binary);
      const response = await requestPdfExtraction({
        fileName: file.name,
        fileContentBase64: base64,
        consentVersion: PDF_CONSENT_VERSION,
        purpose: PDF_EXTRACT_PURPOSE,
        timestamp: new Date().toISOString(),
      });
      setExtraction(response.extraction);
    } catch {
      setExtraction(null);
      setError("Die PDF konnte nicht gelesen werden.");
    } finally {
      setLoading(false);
    }
  };

  const performSuggest = async (request: PdfSuggestRequest, findings: DataRiskFinding[]) => {
    setLoading(true);
    setError(null);
    setPendingReview(null);

    try {
      const response = await requestPdfSuggestion({
        ...request,
        riskAcknowledged: findings.length > 0 ? true : request.riskAcknowledged,
      });
      setSuggestion(response.suggestion);
      setServerWarnings(response.warnings);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Es konnte kein Strukturvorschlag erzeugt werden.");
    } finally {
      setLoading(false);
    }
  };

  const handleSuggest = async () => {
    if (!extraction?.text.trim()) {
      setError("Es liegt noch kein auswertbarer PDF-Text vor.");
      return;
    }
    if (!consent.accepted) {
      setError("Vor der Auswertung ist eine ausdrückliche Einwilligung erforderlich.");
      return;
    }

    const request: PdfSuggestRequest = {
      extractedText: extraction.text,
      filename,
      consentVersion: consent.version,
      purpose: PDF_SUGGEST_PURPOSE,
      timestamp: new Date().toISOString(),
      documentKind,
      assistanceGoal,
      privacyMode,
      answerStyle,
    };
    const findings = classifyPdfDataRisks(buildPdfRiskInspectionText(request));

    if (findings.length > 0) {
      setPendingReview({ request, findings });
      return;
    }

    await performSuggest(request, findings);
  };

  const content = (
    <div className="space-y-5">
      <DismissibleCallout tone="info" resetKey={filename || "pdf-import"}>
        <p className="font-semibold">Wichtig vorab</p>
        <p>
          Der Import erstellt aus der PDF einen automatischen Strukturvorschlag für Aufgaben, Abschnitte und Formularfelder.
          Er ersetzt keine fachliche Prüfung des Originals.
        </p>
        <p className="mt-2">
          Bitte keine unnötigen personenbezogenen Daten, Passwörter oder Zugangsdaten verwenden. Namen und sensible
          Angaben sollten möglichst vorab entfernt oder abgekürzt sein.
        </p>
      </DismissibleCallout>

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className="label">Was ist das für eine PDF?</span>
          <select className="field" value={documentKind} onChange={(event) => setDocumentKind(event.target.value as PdfDocumentKind)} disabled={disabled || loading}>
            {pdfDocumentKindOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <p className="mt-2 text-xs leading-5" style={{ color: "var(--app-text-muted)" }}>
            {pdfDocumentKindOptions.find((option) => option.value === documentKind)?.description}
          </p>
        </label>
        <label className="block">
          <span className="label">Worauf soll der Vorschlag achten?</span>
          <select className="field" value={assistanceGoal} onChange={(event) => setAssistanceGoal(event.target.value as PdfAssistanceGoal)} disabled={disabled || loading}>
            {pdfAssistanceGoalOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <p className="mt-2 text-xs leading-5" style={{ color: "var(--app-text-muted)" }}>
            {pdfAssistanceGoalOptions.find((option) => option.value === assistanceGoal)?.description}
          </p>
        </label>
        <label className="block">
          <span className="label">Wie vorsichtig soll mit sensiblen Daten umgegangen werden?</span>
          <select className="field" value={privacyMode} onChange={(event) => setPrivacyMode(event.target.value as PdfPrivacyMode)} disabled={disabled || loading}>
            {pdfPrivacyModeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <p className="mt-2 text-xs leading-5" style={{ color: "var(--app-text-muted)" }}>
            {pdfPrivacyModeOptions.find((option) => option.value === privacyMode)?.description}
          </p>
        </label>
        <label className="block">
          <span className="label">Wie soll das Ergebnis formuliert sein?</span>
          <select className="field" value={answerStyle} onChange={(event) => setAnswerStyle(event.target.value as PdfAnswerStyle)} disabled={disabled || loading}>
            {pdfAnswerStyleOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <p className="mt-2 text-xs leading-5" style={{ color: "var(--app-text-muted)" }}>
            {pdfAnswerStyleOptions.find((option) => option.value === answerStyle)?.description}
          </p>
        </label>
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="label">PDF-Datei</span>
          <input className="field file:mr-4 file:border-0 file:bg-transparent" type="file" accept="application/pdf,.pdf" onChange={(event) => void handleFileChange(event)} disabled={disabled || loading} />
        </label>
        {filename ? <p className="text-sm" style={{ color: "var(--app-text)" }}>Ausgewählt: {filename}</p> : null}
      </div>

      {extraction ? (
        <div className="rounded-3xl border p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {extraction.pageCountHint ? <Badge tone="slate">{extraction.pageCountHint} Seiten erkannt</Badge> : null}
            <Badge tone={extraction.usedOcr ? "amber" : extraction.isLikelyScan ? "rose" : "emerald"}>
              {extraction.usedOcr ? "OCR verwendet" : extraction.isLikelyScan ? "Wahrscheinlich Scan-PDF" : "Text direkt erkannt"}
            </Badge>
            {extractionFindings.length > 0 ? (
              <Badge tone={hasHighRiskFindings(extractionFindings) ? "rose" : "amber"}>
                {extractionFindings.length} sensible Muster erkannt
              </Badge>
            ) : null}
          </div>

          {extraction.warnings.map((warning) => (
            <div key={warning} className="text-sm leading-6" style={{ color: "var(--app-text)" }}>
              {warning}
            </div>
          ))}

          <div>
            <p className="label">Redigierte Vorschau</p>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-2xl border p-3 text-xs leading-5" style={{ color: "var(--app-text)" }}>
              {previewText || "Keine Vorschau verfügbar."}
            </pre>
          </div>
        </div>
      ) : null}

      <section className="rounded-3xl border p-4">
        <div className="flex items-start gap-3">
          <input
            id="pdf-import-consent"
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-slate-300"
            checked={consent.accepted}
            onChange={(event) =>
              setConsent({
                accepted: event.target.checked,
                version: PDF_CONSENT_VERSION,
                acceptedAt: event.target.checked ? new Date().toISOString() : null,
              })
            }
            disabled={disabled || loading}
          />
          <label htmlFor="pdf-import-consent" className="text-sm leading-6" style={{ color: "var(--app-text)" }}>
            Ich bestätige, dass die ausgewählte PDF für Extraktion, OCR und einen automatischen Strukturvorschlag im
            EWH-Editor verwendet werden darf und dass ich die Inhalte vor der Übernahme fachlich und datenschutzrechtlich prüfe.
          </label>
        </div>
      </section>

      {pendingReview ? (
        <div className="rounded-3xl border border-amber-300 bg-amber-50/70 p-4" role="alert">
          <p className="font-semibold">Sensible Inhalte in der PDF erkannt</p>
          <ul className="mt-3 space-y-2 text-sm leading-6">
            {pendingReview.findings.map((finding) => (
              <li key={`${finding.type}:${finding.match}`}>
                <strong>{finding.match}</strong>: {finding.message}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className="button-secondary" onClick={() => setPendingReview(null)}>
              PDF erst prüfen
            </button>
            <button
              type="button"
              className="button-primary"
              onClick={() => void performSuggest({ ...pendingReview.request, riskAcknowledged: true }, pendingReview.findings)}
            >
              Risiko bewusst bestätigen
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-3xl border border-rose-300 bg-rose-50/80 p-4 text-sm leading-6">{error}</div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="button-primary"
          onClick={() => void handleSuggest()}
          disabled={disabled || loading || !consent.accepted || !extraction?.text.trim()}
        >
          {loading ? "Vorschlag wird erzeugt..." : "Strukturvorschlag erzeugen"}
        </button>
      </div>

      {serverWarnings.length > 0 ? (
        <div className="space-y-2">
          {serverWarnings.map((warning) => (
            <div key={warning} className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3 text-sm leading-6">
              {warning}
            </div>
          ))}
        </div>
      ) : null}

      {suggestion ? (
        <div className="space-y-4 rounded-3xl border p-4">
          <div className="flex flex-wrap items-center gap-2">
          {PDF_IMPORT_NOTICES.map((line) => (
            <Badge key={line} tone={line === "Automatisch erzeugter Strukturvorschlag" ? "amber" : "slate"}>
              {line}
            </Badge>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="label">Titel</p>
              <p className="text-sm" style={{ color: "var(--app-text)" }}>{suggestion.meta.title || "Kein Titel erkannt"}</p>
            </div>
            <div>
              <p className="label">Kurs / Klasse</p>
              <p className="text-sm" style={{ color: "var(--app-text)" }}>{suggestion.meta.course || "Kein Kurs erkannt"}</p>
            </div>
            <div>
              <p className="label">Thema / Unit</p>
              <p className="text-sm" style={{ color: "var(--app-text)" }}>{suggestion.meta.unit || "Kein Thema erkannt"}</p>
            </div>
            <div>
              <p className="label">Datum</p>
              <p className="text-sm" style={{ color: "var(--app-text)" }}>{suggestion.meta.examDate || "Kein Datum erkannt"}</p>
            </div>
          </div>

          <div className="space-y-3">
            {suggestion.sections.map((section, index) => (
              <div key={`${section.title}-${index}`} className="rounded-2xl border p-3">
                <p className="font-semibold" style={{ color: "var(--app-text-strong)" }}>{section.title}</p>
                <p className="mt-1 text-sm leading-6" style={{ color: "var(--app-text)" }}>{section.description}</p>
                <ul className="mt-3 space-y-1 text-sm leading-6" style={{ color: "var(--app-text)" }}>
                  {section.tasks.map((task, taskIndex) => (
                    <li key={`${task.title}-${taskIndex}`}>
                      {task.title}: {task.description}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="space-y-2 text-sm leading-6" style={{ color: "var(--app-text)" }}>
            {suggestion.reviewNotes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>

          <button type="button" className="button-primary" onClick={() => onApplySuggestion(suggestion)} disabled={disabled}>
            {applyLabel}
          </button>
        </div>
      ) : null}
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <Card
      title="PDF-Import und Korrekturvorschlag"
      subtitle="PDF hochladen, Text oder OCR nutzen, sensible Inhalte prüfen und einen Strukturvorschlag für den EWH übernehmen."
      actions={
        <div className="flex flex-wrap gap-2">
          <Badge tone="amber">Strukturvorschlag</Badge>
          <Badge tone="rose">Keine automatische Endnote</Badge>
        </div>
      }
    >
      {content}
    </Card>
  );
};
