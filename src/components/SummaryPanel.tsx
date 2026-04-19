import { ExamSummary } from "../types";
import { formatNumber } from "../utils/format";
import { Badge, Card } from "./ui";

export const SummaryPanel = ({
  summary,
  studentLabel,
  studentLabelTitle = "Aktiver Schülercode",
}: {
  summary: ExamSummary;
  studentLabel?: string | null;
  studentLabelTitle?: string;
}) => (
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
          summary.issues.map((issue) => (
            <div
              key={issue.id}
              className={`rounded-2xl px-4 py-3 text-sm ${issue.level === "error" ? "badge-rose" : "badge-amber"}`}
            >
              {issue.message}
            </div>
          ))
        )}
      </div>
    </div>
  </Card>
);
