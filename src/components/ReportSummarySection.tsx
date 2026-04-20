import { useState } from "react";
import { Exam, ExamSummary } from "../types";
import { formatNumber } from "../utils/format";
import { AutomatedFeedbackStyle, generateAutomatedExamFeedback } from "../utils/reportFeedback";
import { GradeScaleRangeSection } from "./GradeScaleRangeSection";
import { SignaturePad } from "./SignaturePad";

export const ReportSummarySection = ({
  exam,
  summary,
  teacherComment,
  commentPreview,
  signatureDataUrl,
  onTeacherCommentChange,
  onSignatureChange,
}: {
  exam: Exam;
  summary: ExamSummary;
  teacherComment?: string;
  commentPreview?: string;
  signatureDataUrl?: string | null;
  onTeacherCommentChange?: (value: string) => void;
  onSignatureChange?: (value: string | null) => void;
}) => {
  const normalizedTeacherComment = teacherComment?.trim() ?? "";
  const normalizedCommentPreview = commentPreview?.trim() ?? "";
  const germanPrintDate = new Date().toLocaleDateString("de-DE");
  const hasEditableFooter = Boolean(onTeacherCommentChange || onSignatureChange);
  const hasPrintedComment = Boolean(normalizedTeacherComment);
  const hasPrintedSignature = Boolean(signatureDataUrl);
  const useTwoColumns = hasEditableFooter || (hasPrintedComment && hasPrintedSignature);
  const [feedbackStyle, setFeedbackStyle] = useState<AutomatedFeedbackStyle>("balanced");

  const applyAutomatedFeedback = () => {
    if (!onTeacherCommentChange) return;
    onTeacherCommentChange(
      generateAutomatedExamFeedback({
        exam,
        summary,
        style: feedbackStyle,
      }),
    );
  };

  return (
    <section className="surface-elevated rounded-3xl border p-5 print-sheet print-summary">
      <div className="grid gap-4 md:grid-cols-4 print-summary-grid">
        <div className="metric-primary rounded-2xl p-4">
          <p className="label !text-current opacity-80">Gesamt</p>
          <p className="text-xl font-semibold">
            {formatNumber(summary.totalAchievedPoints)} / {formatNumber(summary.totalMaxPoints)}
          </p>
        </div>
        <div className="surface-muted rounded-2xl p-4">
          <p className="label">Prozent</p>
          <p className="themed-strong text-xl font-semibold">{formatNumber(summary.finalPercentage)} %</p>
        </div>
        <div className="metric-accent rounded-2xl p-4">
          <p className="label !text-current opacity-80">Note</p>
          <p className="text-xl font-semibold">{summary.grade.label}</p>
        </div>
        <div className="surface-elevated rounded-2xl border p-4">
          <p className="label">Stufe</p>
          <p className="themed-strong text-xl font-semibold">{summary.grade.verbalLabel}</p>
        </div>
      </div>
      <div className="mt-5">
        <GradeScaleRangeSection
          exam={exam}
          totalMaxPoints={summary.totalMaxPoints}
          title="Notenbereiche"
          subtitle="Die Punktespannen für alle Notenstufen auf Basis der aktuellen Gesamtpunktzahl."
        />
      </div>
      {hasEditableFooter || hasPrintedComment || hasPrintedSignature ? (
        <div className="mt-5">
          <div className="mb-3 no-print">
            <p className="label">Abschlussbereich</p>
            <p className="themed-muted text-sm leading-6">
              Lehrer*innenkommentar und digitale Unterschrift erscheinen im Ausdruck nur, wenn sie ausgefüllt sind.
            </p>
          </div>
          <div
            className={`grid gap-4 print-summary-notes ${
              useTwoColumns ? "md:grid-cols-2" : "md:grid-cols-1"
            }`}
          >
            {hasEditableFooter || hasPrintedComment ? (
              <div className="surface-elevated min-h-32 rounded-2xl border p-4">
                <p className="label">Lehrer*innenkommentar</p>
                {onTeacherCommentChange ? (
                  <>
                    <div className="no-print mt-3 rounded-2xl border p-3">
                      <p className="label">Automatischer Feedback-Vorschlag</p>
                      <p className="themed-muted mt-2 text-sm leading-6">
                        Der Vorschlag kombiniert eine Stärke, einen klaren Entwicklungsbereich und einen nächsten Arbeitsschritt.
                      </p>
                      <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center">
                        <select
                          className="field"
                          value={feedbackStyle}
                          onChange={(event) => setFeedbackStyle(event.target.value as AutomatedFeedbackStyle)}
                        >
                          <option value="balanced">Ausgewogen</option>
                          <option value="encouraging">Ermutigend</option>
                          <option value="direct">Klar und direkt</option>
                        </select>
                        <button type="button" className="button-secondary" onClick={applyAutomatedFeedback}>
                          Vorschlag einsetzen
                        </button>
                      </div>
                    </div>
                    <textarea
                      className="field mt-3 min-h-32 no-print"
                      value={teacherComment ?? ""}
                      placeholder="Kommentar für den Ausdruck. Platzhalter: $Name$, $Vorname$, $Nachname$, $Kürzel$, $Klasse$, $Fach$, $Punkte$, $MaxPunkte$, $Prozent$, $Note$."
                      onChange={(event) => onTeacherCommentChange(event.target.value)}
                    />
                    <p className="themed-muted mt-2 text-xs leading-5 no-print">
                      Platzhalter werden erst im Ausdruck bzw. Export aufgelöst, z. B. mit dem Namen des jeweiligen
                      Kindes.
                    </p>
                    {normalizedTeacherComment && normalizedCommentPreview && normalizedCommentPreview !== normalizedTeacherComment ? (
                      <div className="surface-muted mt-3 rounded-2xl p-3 no-print">
                        <p className="label">Vorschau mit Platzhaltern</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{normalizedCommentPreview}</p>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-3 whitespace-pre-wrap">{normalizedCommentPreview || normalizedTeacherComment}</p>
                )}
                {onTeacherCommentChange && hasPrintedComment ? (
                  <p className="print-only mt-3 whitespace-pre-wrap">{normalizedCommentPreview || normalizedTeacherComment}</p>
                ) : null}
              </div>
            ) : null}
            {hasEditableFooter || hasPrintedSignature ? (
              <div className="surface-elevated min-h-32 rounded-2xl border p-4">
                <p className="label">Unterschrift / Datum</p>
                <p className="mt-3 text-sm" style={{ color: "var(--app-text)" }}>
                  Datum: {germanPrintDate}
                </p>
                {onSignatureChange ? (
                  <div className="mt-3 no-print">
                    <SignaturePad
                      value={signatureDataUrl}
                      onSave={onSignatureChange}
                      onClear={() => onSignatureChange(null)}
                      importSvgPath="/signature.svg"
                    />
                  </div>
                ) : signatureDataUrl ? (
                  <img
                    src={signatureDataUrl}
                    alt="Digitale Unterschrift"
                    className="mt-3 h-20 w-full object-contain object-left"
                  />
                ) : null}
                {onSignatureChange && signatureDataUrl ? (
                  <img
                    src={signatureDataUrl}
                    alt="Digitale Unterschrift"
                    className="print-signature-image mt-3 w-full object-contain object-left"
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
};
