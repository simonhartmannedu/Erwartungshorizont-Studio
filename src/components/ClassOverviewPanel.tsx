import { ClassOverviewData } from "../types";
import { formatNumber } from "../utils/format";
import { Card } from "./ui";

export const ClassOverviewPanel = ({
  overview,
}: {
  overview: ClassOverviewData;
}) => {
  const maxGradeCount = Math.max(...overview.gradeDistribution.map((entry) => entry.count), 1);

  return (
    <Card
      title="Gesamtübersicht"
      subtitle="Klassenweite Verteilung der Noten und durchschnittliche Abschnittsergebnisse."
      className="no-print"
    >
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="surface-muted rounded-3xl p-4">
            <p className="label">Schüler:innen</p>
            <p className="themed-strong text-2xl font-semibold">{overview.studentCount}</p>
          </div>
          <div className="surface-muted rounded-3xl p-4">
            <p className="label">Ø Prozent</p>
            <p className="themed-strong text-2xl font-semibold">{formatNumber(overview.averagePercentage)} %</p>
          </div>
          <div className="surface-muted rounded-3xl p-4">
            <p className="label">Ø Note</p>
            <p className="themed-strong text-2xl font-semibold">
              {formatNumber(overview.averageGrade, 2)}
            </p>
          </div>
          <div className="surface-muted rounded-3xl p-4">
            <p className="label">Median</p>
            <p className="themed-strong text-2xl font-semibold">{formatNumber(overview.medianPercentage)} %</p>
          </div>
        </div>

        <section className="surface-muted rounded-3xl p-4">
          <div className="mb-3">
            <p className="themed-strong text-sm font-semibold">Notenverteilung</p>
            <p className="themed-muted text-sm">Horizontaler Balkenvergleich für exakte Anzahlen pro Note.</p>
          </div>
          <div className="grid gap-3">
            {overview.gradeDistribution.map((entry) => (
              <div key={entry.label} className="grid grid-cols-[minmax(0,130px)_1fr_32px] items-center gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="truncate">{entry.display}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full border" style={{ borderColor: "var(--app-border)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(entry.count / maxGradeCount) * 100}%`, backgroundColor: entry.color }}
                  />
                </div>
                <p className="themed-strong text-right text-sm font-semibold">{entry.count}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="surface-muted rounded-3xl p-4">
          <div className="mb-3">
            <p className="themed-strong text-sm font-semibold">Abschnittsergebnisse</p>
            <p className="themed-muted text-sm">Durchschnittlicher Punkteanteil je Abschnitt mit Legende.</p>
          </div>
          <div className="grid gap-3">
            {overview.sectionDistribution.map((entry) => (
              <div key={entry.sectionId} className="grid grid-cols-[minmax(0,130px)_1fr_50px] items-center gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="truncate">{entry.title}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full border" style={{ borderColor: "var(--app-border)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(0, Math.min(entry.percentage, 100))}%`,
                      backgroundColor: entry.color,
                    }}
                  />
                </div>
                <p className="themed-strong text-right text-sm font-semibold">{formatNumber(entry.percentage)} %</p>
              </div>
            ))}
          </div>

        </section>
      </div>
    </Card>
  );
};
