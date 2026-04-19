import { Exam, ExamSummary } from "../types";
import { formatNumber } from "../utils/format";
import { isLinkedSectionFollower, isLinkedSectionLeader } from "../utils/sectionLinks";
import { GradeScaleRangeSection } from "./GradeScaleRangeSection";
import { Card } from "./ui";

const compactText = (value: string, fallback = "—") => {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;
  return normalized;
};

export const PrintableReport = ({
  exam,
  summary,
  studentAlias,
  studentContext,
}: {
  exam: Exam;
  summary: ExamSummary;
  studentAlias?: string | null;
  studentContext?: {
    subject: string;
    className: string;
    teacherComment: string;
    signatureDataUrl?: string | null;
  } | null;
}) => {
  const showExpectations = exam.printSettings.showExpectations;
  const metadataItems = [
          ["Schuljahr", exam.meta.schoolYear],
          ["Jahrgang / Klasse", `${exam.meta.gradeLevel} · ${exam.meta.course}`],
          ["Lehrkraft", exam.meta.teacher],
          ["Datum", exam.meta.examDate],
          ["Titel", exam.meta.title],
          ["Unit", exam.meta.unit],
          ["Notenschlüssel", exam.gradeScale.title],
          ...(studentAlias ? [["Schülercode", studentAlias]] : []),
          ...(studentContext ? [["Fachgruppe", `${studentContext.subject} · ${studentContext.className}`]] : []),
        ];

  return (
    <Card
      title="Bewertungsbogen"
      subtitle="DIN-A4-orientierte Report-Ansicht für Ausdruck und PDF."
      className="print-sheet print-report"
    >
      <div className="space-y-6 text-sm">
      <div className="no-print grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metadataItems.map(([label, value]) => (
          <div
            key={`screen-${label}`}
            className="surface-panel rounded-3xl border px-5 py-4 backdrop-blur-xl"
            style={{ borderColor: "var(--app-border)", boxShadow: "var(--app-panel-shadow)" }}
          >
            <p className="label">{label}</p>
            <p className="themed-strong text-sm font-semibold leading-6">{value}</p>
          </div>
        ))}
      </div>

      <div className="print-report-meta-row print-only-meta">
        {metadataItems.map(([label, value], index) => (
          <span key={label} className="print-report-meta-item" style={{ color: "var(--app-text)" }}>
            <span className="font-semibold" style={{ color: "var(--app-text-strong)" }}>{label}:</span> {value}
            {index < metadataItems.length - 1 ? " | " : ""}
          </span>
        ))}
      </div>

      <section className="hidden print:block print-mark-sheet">
        <div className="print-mark-sheet-header">
          <p className="print-mark-sheet-title">Mark Sheet for {studentAlias ?? "___________________________________________"}</p>
          <p className="print-mark-sheet-meta">
            {exam.meta.title} | {exam.meta.gradeLevel}{exam.meta.course ? ` ${exam.meta.course}` : ""} | {exam.meta.examDate} | {exam.meta.teacher}
          </p>
        </div>

        <table className="print-master-table">
          <colgroup>
            <col className="w-[9%]" />
            <col className="w-[23.5%]" />
            <col className="w-[62.5%]" />
            <col className="w-[2.5%]" />
            <col className="w-[2.5%]" />
          </colgroup>
          <thead>
            <tr>
              <th>Nr.</th>
              <th>Bereich</th>
              <th>Kriterium / Erwartung</th>
              <th>Max.</th>
              <th>Ist</th>
            </tr>
          </thead>
          <tbody>
            {exam.sections.map((section, index) => {
              const nextSection = exam.sections[index + 1];
              const isLinkedLead = isLinkedSectionLeader(exam.sections, index);

              if (isLinkedSectionFollower(exam.sections, index)) {
                return null;
              }

              const renderSectionRows = (entry: typeof section, entryIndex: number) => {
                const result = summary.sectionResults.find((item) => item.sectionId === entry.id)!;

                return [
                  <tr key={`section-heading-${entry.id}`} className="print-master-section-row">
                    <td>{entryIndex + 1}.</td>
                    <td colSpan={2}>
                      <strong>{entry.title}</strong>
                      {entry.description.trim() && (
                        <span className="print-inline-note"> {compactText(entry.description, "")}</span>
                      )}
                    </td>
                    <td>{formatNumber(result.maxPoints)}</td>
                    <td>{formatNumber(result.achievedPoints)}</td>
                  </tr>,
                  ...entry.tasks.flatMap((task, taskIndex) => {
                    const taskNumber = `${entryIndex + 1}.${taskIndex + 1}`;
                    const taskRows = [
                      <tr key={`task-${task.id}`} className="print-master-task-row">
                        <td>{taskNumber}</td>
                        <td>{compactText(task.title)}</td>
                        <td>{compactText(task.description)}</td>
                        <td>{formatNumber(task.maxPoints)}</td>
                        <td>{formatNumber(task.achievedPoints)}</td>
                      </tr>,
                    ];

                    if (showExpectations && task.expectation.trim()) {
                      taskRows.push(
                        <tr key={`task-expectation-${task.id}`} className="print-master-subrow">
                          <td>{taskNumber}.a</td>
                          <td>Erwartung</td>
                          <td>{compactText(task.expectation)}</td>
                          <td></td>
                          <td></td>
                        </tr>,
                      );
                    }

                    return taskRows;
                  }),
                  ...(entry.note.trim()
                    ? [
                        <tr key={`section-note-${entry.id}`} className="print-master-subrow">
                          <td>{entryIndex + 1}.n</td>
                          <td>Hinweis</td>
                          <td>{compactText(entry.note)}</td>
                          <td></td>
                          <td></td>
                        </tr>,
                      ]
                    : []),
                ];
              };

              if (!isLinkedLead) {
                return renderSectionRows(section, index);
              }

              return [
                <tr key={`linked-heading-${section.id}`} className="print-master-linked-row">
                  <td></td>
                  <td colSpan={4}>Verknüpfter Abschnittsblock</td>
                </tr>,
                ...renderSectionRows(section, index),
                ...(nextSection ? renderSectionRows(nextSection, index + 1) : []),
              ];
            })}
          </tbody>
        </table>

        <div className="print-mark-sheet-footer">
          <p>Gesamt: {formatNumber(summary.totalAchievedPoints)} / {formatNumber(summary.totalMaxPoints)}</p>
          <p>Prozent: {formatNumber(summary.finalPercentage)} %</p>
          <p>Note: {summary.grade.label}</p>
          <p>Stufe: {summary.grade.verbalLabel}</p>
        </div>
      </section>

      <GradeScaleRangeSection
        exam={exam}
        totalMaxPoints={summary.totalMaxPoints}
        className="print-hidden"
      />

      {exam.sections.map((section, index) => {
        const nextSection = exam.sections[index + 1];
        const isLinkedLead = isLinkedSectionLeader(exam.sections, index);

        if (isLinkedSectionFollower(exam.sections, index)) {
          return null;
        }

        const renderSection = (entry: typeof section, entryIndex: number) => {
          const result = summary.sectionResults.find((item) => item.sectionId === entry.id)!;

          return (
            <section key={entry.id} className="surface-elevated rounded-3xl border p-4 print-sheet print-hidden">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <h3 className="themed-strong text-base font-semibold">
                  {entryIndex + 1}. {entry.title}
                </h3>
                <p className="themed-muted">{entry.description}</p>
              </div>
              <div className="text-right" style={{ color: "var(--app-text)" }}>
                <p>{formatNumber(result.achievedPoints)} / {formatNumber(result.maxPoints)} Punkte</p>
                <p>{formatNumber(result.percentage)} % · Gewichtung {formatNumber(entry.weight)} %</p>
              </div>
            </div>
            <div className="themed-table-shell overflow-hidden rounded-2xl border print-section-table-wrapper">
              <table className="min-w-full print-section-table">
                <colgroup>
                  <col className="w-[10%]" />
                  <col className="w-[29.5%]" />
                  <col className="w-[55%]" />
                  <col className="w-[2.75%]" />
                  <col className="w-[2.75%]" />
                </colgroup>
                <thead>
                  <tr className="themed-table-head text-left text-xs uppercase tracking-[0.16em]">
                    <th className="px-4 py-3">Nr.</th>
                    <th className="px-4 py-3">Punkt</th>
                    <th className="px-4 py-3">Orientierung / Erwartung</th>
                    <th className="px-4 py-3 text-center">Max.</th>
                    <th className="px-4 py-3 text-center">Ist</th>
                  </tr>
                </thead>
                <tbody className="themed-table-body">
                  {entry.tasks.map((task, taskIndex) => (
                    <tr key={task.id} className="themed-table-row">
                      <td className="themed-strong px-4 py-3 align-top font-semibold">
                        {entryIndex + 1}.{taskIndex + 1}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p className="themed-strong mt-1 font-medium">{task.title}</p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p className="mt-1 whitespace-pre-wrap leading-6" style={{ color: "var(--app-text)" }}>
                          {task.description || "—"}
                        </p>
                        {showExpectations && task.expectation.trim() && (
                          <p className="themed-muted mt-2 whitespace-pre-wrap">
                            <span className="themed-strong font-semibold">
                              {entryIndex + 1}.{taskIndex + 1}.a Erwartung:
                            </span>{" "}
                            {task.expectation}
                          </p>
                        )}
                      </td>
                      <td className="themed-strong px-4 py-3 text-center align-top font-semibold">
                        {formatNumber(task.maxPoints)}
                      </td>
                      <td className="themed-strong px-4 py-3 text-center align-top font-semibold">
                        {formatNumber(task.achievedPoints)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {entry.note && (
              <div className="surface-muted mt-4 rounded-2xl p-4 print-note">
                <strong className="themed-strong mr-2">{entryIndex + 1}.n Hinweis:</strong>
                {entry.note}
              </div>
            )}
          </section>
          );
        };

        if (!isLinkedLead) {
          return renderSection(section, index);
        }

        return (
          <div
            key={`print-linked-block-${section.id}`}
            className="p-0 print-sheet print-linked-block"
          >
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3 print-linked-block-header">
              <div>
                <p className="warning-note text-xs font-semibold uppercase tracking-[0.18em]">
                  Verknüpfter Abschnittsblock
                </p>
                <p className="mt-1 text-sm" style={{ color: "var(--app-text)" }}>
                  Beide Abschnitte werden zusammen dargestellt, bleiben in der Berechnung aber getrennt.
                </p>
              </div>
              <div className="surface-elevated rounded-full border px-3 py-1 text-xs font-semibold">
                Verknüpft
              </div>
            </div>
            <div className="space-y-4">
              {renderSection(section, index)}
              {nextSection && renderSection(nextSection, index + 1)}
            </div>
          </div>
        );
      })}

    </div>
  </Card>
);
};
