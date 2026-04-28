import { DraftWorkspace, StudentDatabase, StudentGroup, StudentRecord } from "../types";
import { calculateExamSummary } from "../utils/calculations";
import { formatNumber } from "../utils/format";
import { buildExamForStudent, getStudentAssessment, getStudentCorrectionStatus } from "../utils/students";
import { Badge } from "./ui";

type PerformanceStatus = "corrected" | "inProgress" | "uncorrected";

type PerformanceEntry = {
  workspaceId: string;
  label: string;
  dateLabel: string;
  sortTime: number;
  percentage: number;
  gradeDisplay: string;
  achievedPoints: number;
  maxPoints: number;
  status: PerformanceStatus;
  classAverage: number | null;
};

type CompetenceEntry = {
  id: string;
  label: string;
  percentage: number | null;
  classAverage: number | null;
  achievedPoints: number;
  maxPoints: number;
  evidenceCount: number;
};

interface Props {
  database: StudentDatabase;
  group: StudentGroup;
  student: StudentRecord;
  studentLabel: string;
  workspaces: DraftWorkspace[];
}

const clampPercentage = (value: number) => Math.min(Math.max(value, 0), 100);

const getWorkspaceLabel = (workspace: DraftWorkspace) =>
  workspace.exam.meta.title.trim() || workspace.label || "Klassenarbeit";

const getWorkspaceDateInfo = (workspace: DraftWorkspace) => {
  const examDate = workspace.exam.meta.examDate.trim();
  const candidate = examDate ? new Date(examDate) : new Date(workspace.updatedAt);
  const fallback = new Date(workspace.updatedAt);
  const date = Number.isNaN(candidate.getTime()) ? fallback : candidate;

  return {
    label: Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("de-DE"),
    sortTime: Number.isNaN(date.getTime()) ? 0 : date.getTime(),
  };
};

const hasAnyTaskScore = (workspace: DraftWorkspace, database: StudentDatabase, studentId: string) => {
  const taskIds = new Set(workspace.exam.sections.flatMap((section) => section.tasks.map((task) => task.id)));
  const assessment = getStudentAssessment(database, studentId, workspace.id);
  return Object.keys(assessment.taskScores).some((taskId) => taskIds.has(taskId));
};

const normalizeAreaKey = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase("de-DE")
    .replace(/\s+/g, " ");

const getSectionAreaLabel = (section: DraftWorkspace["exam"]["sections"][number], index: number) => {
  const title = section.title.trim();
  if (!title) return `Abschnitt ${index + 1}`;

  const withoutPrefix = title
    .replace(/^(?:\d+\.\s*)?(?:klausurteil|teil|part|section)\s+[a-z0-9]+\.?\s*[:\-–]\s*/i, "")
    .replace(/^(?:\d+\.\s*)?(?:aufgabenteil|abschnitt)\s+\d+\.?\s*[:\-–]\s*/i, "")
    .trim();

  return withoutPrefix || title;
};

const getAreaDefinitions = (workspaces: DraftWorkspace[], groupId: string) => {
  const areas = new Map<string, { id: string; label: string }>();

  workspaces
    .filter((workspace) => workspace.assignedGroupId === groupId)
    .forEach((workspace) => {
      workspace.exam.sections.forEach((section, index) => {
        const label = getSectionAreaLabel(section, index);
        const id = normalizeAreaKey(label);
        if (!areas.has(id)) {
          areas.set(id, { id, label });
        }
      });
    });

  return Array.from(areas.values());
};

const getStudentAreaTotals = (
  workspaces: DraftWorkspace[],
  database: StudentDatabase,
  groupId: string,
  studentId: string,
) => {
  const areaDefinitions = getAreaDefinitions(workspaces, groupId);
  const totals = new Map<string, { achievedPoints: number; maxPoints: number; evidenceCount: number }>(
    areaDefinitions.map((area) => [area.id, { achievedPoints: 0, maxPoints: 0, evidenceCount: 0 }]),
  );

  workspaces
    .filter((workspace) => workspace.assignedGroupId === groupId)
    .forEach((workspace) => {
      const assessment = getStudentAssessment(database, studentId, workspace.id);

      workspace.exam.sections.forEach((section, index) => {
        const areaId = normalizeAreaKey(getSectionAreaLabel(section, index));

        section.tasks.forEach((task) => {
          if (!Object.prototype.hasOwnProperty.call(assessment.taskScores, task.id)) return;

          const current = totals.get(areaId);
          if (!current) return;

          current.achievedPoints += assessment.taskScores[task.id] ?? 0;
          current.maxPoints += task.maxPoints;
          current.evidenceCount += 1;
        });
      });
    });

  return totals;
};

const buildCompetenceEntries = (
  workspaces: DraftWorkspace[],
  database: StudentDatabase,
  group: StudentGroup,
  student: StudentRecord,
): CompetenceEntry[] => {
  const areaDefinitions = getAreaDefinitions(workspaces, group.id);
  const studentTotals = getStudentAreaTotals(workspaces, database, group.id, student.id);
  const classTotalsByStudent = group.students
    .filter((entry) => !entry.isAbsent)
    .map((entry) => getStudentAreaTotals(workspaces, database, group.id, entry.id));

  return areaDefinitions.map((area) => {
    const totals = studentTotals.get(area.id) ?? { achievedPoints: 0, maxPoints: 0, evidenceCount: 0 };
    const classPercentages = classTotalsByStudent
      .map((classTotals) => classTotals.get(area.id))
      .filter((entry): entry is { achievedPoints: number; maxPoints: number; evidenceCount: number } => Boolean(entry && entry.maxPoints > 0))
      .map((entry) => (entry.achievedPoints / entry.maxPoints) * 100);

    return {
      ...area,
      percentage: totals.maxPoints > 0 ? (totals.achievedPoints / totals.maxPoints) * 100 : null,
      classAverage: classPercentages.length > 0
        ? classPercentages.reduce((sum, value) => sum + value, 0) / classPercentages.length
        : null,
      achievedPoints: totals.achievedPoints,
      maxPoints: totals.maxPoints,
      evidenceCount: totals.evidenceCount,
    };
  });
};

const getClassAverage = (workspace: DraftWorkspace, database: StudentDatabase, group: StudentGroup) => {
  const percentages = group.students
    .filter((student) => !student.isAbsent && hasAnyTaskScore(workspace, database, student.id))
    .map((student) => {
      const studentExam = buildExamForStudent(
        workspace.exam,
        database,
        { groupId: group.id, studentId: student.id },
        workspace.id,
      );
      return calculateExamSummary(studentExam).finalPercentage;
    })
    .filter((value) => Number.isFinite(value));

  if (percentages.length === 0) return null;
  return percentages.reduce((sum, value) => sum + value, 0) / percentages.length;
};

const buildPerformanceEntries = (
  workspaces: DraftWorkspace[],
  database: StudentDatabase,
  group: StudentGroup,
  student: StudentRecord,
): PerformanceEntry[] =>
  workspaces
    .filter((workspace) => workspace.assignedGroupId === group.id)
    .map((workspace) => {
      const dateInfo = getWorkspaceDateInfo(workspace);
      const assessment = getStudentAssessment(database, student.id, workspace.id);
      const status = getStudentCorrectionStatus(workspace.exam, assessment);
      const studentExam = buildExamForStudent(
        workspace.exam,
        database,
        { groupId: group.id, studentId: student.id },
        workspace.id,
      );
      const summary = calculateExamSummary(studentExam);

      return {
        workspaceId: workspace.id,
        label: getWorkspaceLabel(workspace),
        dateLabel: dateInfo.label,
        sortTime: dateInfo.sortTime,
        percentage: summary.finalPercentage,
        gradeDisplay: summary.grade.schoolDisplay,
        achievedPoints: summary.totalAchievedPoints,
        maxPoints: summary.totalMaxPoints,
        status,
        classAverage: getClassAverage(workspace, database, group),
      };
    })
    .sort((left, right) => left.sortTime - right.sortTime);

const getStatusLabel = (status: PerformanceStatus) => {
  if (status === "corrected") return "fertig";
  if (status === "inProgress") return "in Arbeit";
  return "ohne Daten";
};

const getStatusTone = (status: PerformanceStatus): "emerald" | "amber" | "slate" => {
  if (status === "corrected") return "emerald";
  if (status === "inProgress") return "amber";
  return "slate";
};

const getRadarPoint = (index: number, count: number, value: number) => {
  const center = 160;
  const radius = 104;
  const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;
  const distance = (clampPercentage(value) / 100) * radius;

  return {
    x: center + Math.cos(angle) * distance,
    y: center + Math.sin(angle) * distance,
    axisX: center + Math.cos(angle) * radius,
    axisY: center + Math.sin(angle) * radius,
    labelX: center + Math.cos(angle) * 126,
    labelY: center + Math.sin(angle) * 126,
  };
};

const buildPoints = <T,>(entries: T[], getValue: (entry: T) => number) =>
  entries
    .map((entry, index) => {
      const point = getRadarPoint(index, entries.length, getValue(entry));
      return `${point.x},${point.y}`;
    })
    .join(" ");

const getShortAxisLabel = (value: string, index: number) => {
  const trimmed = value.trim();
  if (!trimmed) return `K${index + 1}`;
  return trimmed.length > 13 ? `${trimmed.slice(0, 12)}...` : trimmed;
};

const RadarGraph = ({ entries }: { entries: CompetenceEntry[] }) => {
  const scoredEntries = entries.filter((entry) => entry.percentage !== null);
  const averageEntries = entries.filter((entry) => entry.classAverage !== null);

  if (scoredEntries.length === 0) {
    return (
      <div className="student-performance-empty rounded-3xl border p-5 text-sm leading-6">
        Für diesen Schülercode liegen noch keine auswertbaren Kompetenzdaten vor.
      </div>
    );
  }

  const gridLevels = [20, 40, 60, 80, 100];

  return (
    <div className="student-performance-radar">
      <svg viewBox="0 0 320 320" role="img" aria-label="Radar-Auswertung der Klausurleistungen">
        {gridLevels.map((level) => (
          <polygon
            key={level}
            points={buildPoints(entries, () => level)}
            className="student-performance-radar-grid"
          />
        ))}
        {entries.map((entry, index) => {
          const point = getRadarPoint(index, entries.length, 100);
          return (
            <line
              key={`axis-${entry.id}`}
              x1="160"
              y1="160"
              x2={point.axisX}
              y2={point.axisY}
              className="student-performance-radar-axis"
            />
          );
        })}
        {averageEntries.length >= 3 ? (
          <polygon
            points={buildPoints(entries, (entry) => entry.classAverage ?? 0)}
            className="student-performance-radar-class"
          />
        ) : null}
        <polygon
          points={buildPoints(entries, (entry) => entry.percentage ?? 0)}
          className="student-performance-radar-student"
        />
        {entries.map((entry, index) => {
          const point = getRadarPoint(index, entries.length, entry.percentage ?? 0);
          const labelPoint = getRadarPoint(index, entries.length, 100);
          const textAnchor = labelPoint.labelX < 132 ? "end" : labelPoint.labelX > 188 ? "start" : "middle";

          return (
            <g key={`point-${entry.id}`}>
              <circle cx={point.x} cy={point.y} r="4.2" className="student-performance-radar-dot">
                <title>{`${entry.label}: ${entry.percentage === null ? "keine Daten" : `${formatNumber(entry.percentage)} %`}`}</title>
              </circle>
              <text
                x={labelPoint.labelX}
                y={labelPoint.labelY}
                textAnchor={textAnchor}
                className="student-performance-radar-label"
              >
                {getShortAxisLabel(entry.label, index)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export const StudentPerformanceView = ({ database, group, student, studentLabel, workspaces }: Props) => {
  const entries = buildPerformanceEntries(workspaces, database, group, student);
  const competenceEntries = buildCompetenceEntries(workspaces, database, group, student);
  const scoredCompetences = competenceEntries.filter((entry) => entry.percentage !== null);
  const scoredEntries = entries.filter((entry) => entry.status !== "uncorrected");
  const average =
    scoredEntries.length > 0
      ? scoredEntries.reduce((sum, entry) => sum + entry.percentage, 0) / scoredEntries.length
      : 0;
  const competenceAverage =
    scoredCompetences.length > 0
      ? scoredCompetences.reduce((sum, entry) => sum + (entry.percentage ?? 0), 0) / scoredCompetences.length
      : 0;
  const strongestCompetence = scoredCompetences.reduce<CompetenceEntry | null>(
    (best, entry) => (!best || (entry.percentage ?? -1) > (best.percentage ?? -1) ? entry : best),
    null,
  );
  const weakestCompetence = scoredCompetences.reduce<CompetenceEntry | null>(
    (weakest, entry) => (!weakest || (entry.percentage ?? 101) < (weakest.percentage ?? 101) ? entry : weakest),
    null,
  );

  return (
    <div className="student-performance-view rounded-[28px] border p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="label">SuS-View</p>
          <h3 className="themed-strong text-lg font-semibold">{studentLabel}</h3>
          <p className="themed-muted mt-1 text-sm">
            Radar nach den Aufgabenteil-Headern aus den zugewiesenen Klausuren im EWH-Editor.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="slate">{entries.length} Klausuren</Badge>
          <Badge tone={scoredEntries.length > 0 ? "emerald" : "amber"}>{scoredEntries.length} mit Daten</Badge>
          <Badge tone={scoredCompetences.length > 0 ? "emerald" : "amber"}>{scoredCompetences.length} Bereiche</Badge>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(320px,1.05fr)]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="surface-muted rounded-2xl p-3">
              <p className="label">Ø Kompetenz</p>
              <p className="themed-strong text-xl font-semibold">{scoredCompetences.length ? `${formatNumber(competenceAverage)} %` : "-"}</p>
            </div>
            <div className="surface-muted rounded-2xl p-3">
              <p className="label">Stärkster Bereich</p>
              <p className="themed-strong text-sm font-semibold">{strongestCompetence ? strongestCompetence.label : "-"}</p>
              {strongestCompetence?.percentage != null ? <p className="themed-muted mt-1 text-sm">{formatNumber(strongestCompetence.percentage)} %</p> : null}
            </div>
            <div className="surface-muted rounded-2xl p-3">
              <p className="label">Schwächster Bereich</p>
              <p className="themed-strong text-sm font-semibold">{weakestCompetence ? weakestCompetence.label : "-"}</p>
              {weakestCompetence?.percentage != null ? <p className="themed-muted mt-1 text-sm">{formatNumber(weakestCompetence.percentage)} %</p> : null}
            </div>
          </div>

          <div className="student-performance-legend flex flex-wrap gap-3 text-xs font-semibold">
            <span><i className="student-performance-key student-performance-key-student" /> SuS</span>
            <span><i className="student-performance-key student-performance-key-class" /> Klassenschnitt</span>
          </div>

          <div className="themed-table-shell overflow-hidden rounded-2xl border">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="themed-table-head">
                  <tr className="text-left text-xs uppercase tracking-[0.16em]">
                    <th className="px-4 py-3">Bereich</th>
                    <th className="px-4 py-3 text-right">SuS</th>
                    <th className="px-4 py-3 text-right">Klasse</th>
                    <th className="px-4 py-3 text-right">Aufgaben</th>
                  </tr>
                </thead>
                <tbody className="themed-table-body">
                  {competenceEntries.map((entry) => (
                    <tr key={entry.id} className="themed-table-row">
                      <td className="px-4 py-3 align-top">
                        <p className="themed-strong font-semibold">{entry.label}</p>
                      </td>
                      <td className="px-4 py-3 text-right align-top">
                        {entry.percentage === null ? (
                          <span className="themed-muted">-</span>
                        ) : (
                          <>
                            <p className="themed-strong font-semibold">{formatNumber(entry.percentage)} %</p>
                            <p className="themed-muted mt-1 text-xs">
                              {formatNumber(entry.achievedPoints)} / {formatNumber(entry.maxPoints)} P.
                            </p>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right align-top">
                        {entry.classAverage === null ? "-" : `${formatNumber(entry.classAverage)} %`}
                      </td>
                      <td className="px-4 py-3 text-right align-top">{entry.evidenceCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="themed-muted text-xs leading-5">
            Klausur-Ø: {scoredEntries.length ? `${formatNumber(average)} %` : "-"}.
            Die Bereichszuordnung nutzt die Abschnittsüberschriften der Klausuren, z. B. "Teil A: Leseverstehen".
          </p>

          <div className="themed-table-shell overflow-hidden rounded-2xl border">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="themed-table-head">
                  <tr className="text-left text-xs uppercase tracking-[0.16em]">
                    <th className="px-4 py-3">Klausur</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">SuS</th>
                    <th className="px-4 py-3 text-right">Klasse</th>
                  </tr>
                </thead>
                <tbody className="themed-table-body">
                  {entries.map((entry) => (
                    <tr key={entry.workspaceId} className="themed-table-row">
                      <td className="px-4 py-3 align-top">
                        <p className="themed-strong font-semibold">{entry.label}</p>
                        <p className="themed-muted mt-1 text-xs">{entry.dateLabel}</p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Badge tone={getStatusTone(entry.status)}>{getStatusLabel(entry.status)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right align-top">
                        {entry.status === "uncorrected" ? (
                          <span className="themed-muted">-</span>
                        ) : (
                          <>
                            <p className="themed-strong font-semibold">{formatNumber(entry.percentage)} %</p>
                            <p className="themed-muted mt-1 text-xs">
                              {formatNumber(entry.achievedPoints)} / {formatNumber(entry.maxPoints)} P. · {entry.gradeDisplay}
                            </p>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right align-top">
                        {entry.classAverage === null ? "-" : `${formatNumber(entry.classAverage)} %`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <RadarGraph entries={competenceEntries} />
      </div>
    </div>
  );
};
