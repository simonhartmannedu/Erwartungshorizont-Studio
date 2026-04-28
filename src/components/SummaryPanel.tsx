import { useEffect, useState } from "react";
import { ExamSummary } from "../types";
import { formatNumber } from "../utils/format";
import { ChevronDownIcon, ChevronRightIcon, WarningIcon } from "./icons";
import { Badge, Card } from "./ui";

export const SummaryPanel = ({
  summary,
  studentLabel,
  studentLabelTitle = "Aktiver Schülercode",
  correctionCoverage,
  locked = false,
}: {
  summary: ExamSummary;
  studentLabel?: string | null;
  studentLabelTitle?: string;
  correctionCoverage?: {
    relevantStudentCount: number;
    correctedCount: number;
    inProgressCount: number;
    uncorrectedCount: number;
    absentCount: number;
  } | null;
  locked?: boolean;
}) => {
  const [issuesCollapsed, setIssuesCollapsed] = useState(summary.issues.length > 0);

  useEffect(() => {
    setIssuesCollapsed(summary.issues.length > 0);
  }, [summary.issues.length]);

  return (
    <Card
      title="Live-Auswertung"
      subtitle="Alle Summen, Prozentwerte und Noten aktualisieren sich automatisch."
    >
      <div className="grid gap-4">
      {studentLabel && (
        <div className="badge-emerald rounded-3xl p-4">
          <p className="label !text-current">{studentLabelTitle}</p>
          <p className="text-xl font-semibold">{studentLabel}</p>
        </div>
      )}
      {locked ? (
        <div className="surface-muted rounded-3xl border p-4">
          <div className="flex items-start gap-3">
            <WarningIcon className="mt-0.5 h-4 w-4 text-amber-600 dark:text-amber-300" />
            <div>
              <p className="themed-strong text-sm font-semibold">Bewertungsdaten gesperrt</p>
              <p className="themed-muted mt-1 text-sm leading-6">
                Punkte, Prozentwerte, Noten, Kommentare und Unterschriften werden erst nach Entsperrung der Lerngruppe geladen.
              </p>
            </div>
          </div>
        </div>
      ) : null}
      {!locked ? (
        <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="metric-primary rounded-3xl p-4">
          <p className="label !text-current opacity-80">Gesamtpunkte</p>
          <p className="text-2xl font-semibold">{formatNumber(summary.totalAchievedPoints)} / {formatNumber(summary.totalMaxPoints)}</p>
        </div>
        <div className="metric-accent rounded-3xl p-4">
          <p className="label !text-current opacity-80">Note</p>
          <p className="text-2xl font-semibold">{summary.grade.label}</p>
          <p className="text-sm">{summary.grade.verbalLabel}</p>
        </div>
      </div>
      <div className="surface-muted grid gap-3 rounded-3xl p-4">
        <div className="flex items-center justify-between">
          <span className="themed-muted text-sm">Finale Bewertungsbasis</span>
          <strong>{formatNumber(summary.finalPercentage)} %</strong>
        </div>
        <div className="grade-ladder rounded-3xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="label !mb-1 !text-current opacity-75">Nächste bessere Note</p>
              {summary.nextGradeProgress.nextGradeLabel ? (
                <>
                  <p className="text-sm font-semibold" style={{ color: "var(--app-text-strong)" }}>
                    Noch {formatNumber(summary.nextGradeProgress.pointsNeeded)} Punkte bis {summary.nextGradeProgress.nextGradeLabel}
                  </p>
                  <p className="text-xs" style={{ color: "var(--app-text-muted)" }}>
                    {summary.nextGradeProgress.nextGradeVerbalLabel}
                  </p>
                </>
              ) : (
                <p className="text-sm font-semibold" style={{ color: "var(--app-text-strong)" }}>
                  Beste Notenstufe bereits erreicht
                </p>
              )}
            </div>
            <strong className="text-sm" style={{ color: "var(--app-text-strong)" }}>
              {Math.round(summary.nextGradeProgress.currentBandProgress * 100)} %
            </strong>
          </div>
          <div
            className="grade-ladder-track mt-3"
            role="progressbar"
            aria-label="Fortschritt zur nächsten besseren Note"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(summary.nextGradeProgress.currentBandProgress * 100)}
          >
            <div
              className="grade-ladder-fill"
              style={{ width: `${summary.nextGradeProgress.currentBandProgress * 100}%` }}
            />
            {summary.nextGradeProgress.nextGradeLabel ? (
              <div
                className="grade-ladder-marker"
                style={{ left: `${summary.nextGradeProgress.currentBandProgress * 100}%` }}
              />
            ) : null}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {summary.issues.length === 0 ? (
          <Badge tone="emerald">Keine Validierungshinweise</Badge>
        ) : (
          <section className="surface-muted rounded-3xl p-4">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 text-left"
              onClick={() => setIssuesCollapsed((current) => !current)}
              aria-expanded={!issuesCollapsed}
            >
              <span className="flex items-center gap-2">
                <WarningIcon className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                <span className="themed-strong text-sm font-semibold">
                  Hinweise zu Punkten und Eingaben
                </span>
                <span className="label">{summary.issues.length}</span>
              </span>
              {issuesCollapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
            </button>
            {!issuesCollapsed ? (
              <div className="mt-3 space-y-2">
                {summary.issues.map((issue) => (
                  <div
                    key={issue.id}
                    className={`rounded-2xl px-4 py-3 text-sm ${issue.level === "error" ? "badge-rose" : "badge-amber"}`}
                  >
                    {issue.message}
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        )}
      </div>
      {correctionCoverage ? (
        <div className="surface-muted rounded-3xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="themed-strong text-sm font-semibold">Korrekturstand</p>
              <p className="themed-muted text-sm">
                {correctionCoverage.correctedCount} von {correctionCoverage.relevantStudentCount} anwesenden Arbeiten sind fertig korrigiert.
              </p>
            </div>
            <strong>{correctionCoverage.relevantStudentCount > 0
              ? Math.round((correctionCoverage.correctedCount / correctionCoverage.relevantStudentCount) * 100)
              : 0} %</strong>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border px-4 py-3">
              <p className="label">Offen</p>
              <p className="themed-strong text-lg font-semibold">{correctionCoverage.uncorrectedCount}</p>
            </div>
            <div className="rounded-2xl border px-4 py-3">
              <p className="label">In Korrektur</p>
              <p className="themed-strong text-lg font-semibold">{correctionCoverage.inProgressCount}</p>
            </div>
            <div className="rounded-2xl border px-4 py-3">
              <p className="label">Korrigiert</p>
              <p className="themed-strong text-lg font-semibold">{correctionCoverage.correctedCount}</p>
            </div>
            <div className="rounded-2xl border px-4 py-3">
              <p className="label">Abwesend</p>
              <p className="themed-strong text-lg font-semibold">{correctionCoverage.absentCount}</p>
            </div>
          </div>
        </div>
      ) : null}
        </>
      ) : null}
      </div>
    </Card>
  );
};
