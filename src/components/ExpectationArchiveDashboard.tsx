import { Fragment, useMemo, useState } from "react";
import { DraftWorkspace, ExpectationArchiveEntry, StudentDatabase } from "../types";
import { formatDateTime, formatNumber } from "../utils/format";
import { getStudentAssessment } from "../utils/students";
import { DuplicateIcon, OpenIcon, TrashIcon } from "./icons";
import { Card, Field } from "./ui";

interface Props {
  entries: ExpectationArchiveEntry[];
  studentDatabase: StudentDatabase;
  workspaces: DraftWorkspace[];
  onOpen: (entry: ExpectationArchiveEntry) => void;
  onDuplicateToBuilder: (entry: ExpectationArchiveEntry) => void;
  onDelete: (entry: ExpectationArchiveEntry) => void;
}

export const ExpectationArchiveDashboard = ({
  entries,
  studentDatabase,
  workspaces,
  onOpen,
  onDuplicateToBuilder,
  onDelete,
}: Props) => {
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");

  const years = useMemo(
    () => [...new Set(entries.map((entry) => entry.schoolYear).filter(Boolean))].sort().reverse(),
    [entries],
  );

  const grades = useMemo(
    () => [...new Set(entries.map((entry) => entry.gradeLevel).filter(Boolean))].sort(),
    [entries],
  );

  const filteredEntries = useMemo(() => {
    const term = search.trim().toLowerCase();
    return entries.filter((entry) => {
      const matchesSearch =
        !term ||
        [
          entry.examTitle,
          entry.summaryText,
          entry.teacher,
          entry.course,
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);

      return (
        matchesSearch &&
        (!yearFilter || entry.schoolYear === yearFilter) &&
        (!gradeFilter || entry.gradeLevel === gradeFilter)
      );
    });
  }, [entries, gradeFilter, search, yearFilter]);

  const progressByEntryId = useMemo(
    () =>
      new Map(
        entries.map((entry) => {
          const linkedWorkspaces = workspaces.filter(
            (workspace, index, allWorkspaces) =>
              (workspace.activeArchiveEntryId === entry.id || workspace.exam.id === entry.examId) &&
              allWorkspaces.findIndex((candidate) => candidate.id === workspace.id) === index,
          );

          let completedStudents = 0;
          let studentCount = 0;
          let unassignedWorkspaceCount = 0;
          const linkedGroupLabels: string[] = [];

          linkedWorkspaces.forEach((workspace) => {
            if (!workspace.assignedGroupId) {
              unassignedWorkspaceCount += 1;
              return;
            }

            const group = studentDatabase.groups.find((candidate) => candidate.id === workspace.assignedGroupId);
            if (!group) {
              unassignedWorkspaceCount += 1;
              return;
            }

            linkedGroupLabels.push(`${group.subject} · ${group.className}`);
            const requiredTaskIds = workspace.exam.sections.flatMap((section) => section.tasks.map((task) => task.id));
            const presentStudents = group.students.filter((student) => !student.isAbsent);
            studentCount += presentStudents.length;
            completedStudents += presentStudents.filter((student) => {
              const assessment = getStudentAssessment(studentDatabase, student.id, workspace.id);
              return requiredTaskIds.every((taskId) => Object.prototype.hasOwnProperty.call(assessment.taskScores, taskId));
            }).length;
          });

          const progress = studentCount > 0 ? completedStudents / studentCount : 0;

          return [
            entry.id,
            {
              completedStudents,
              studentCount,
              progress,
              linkedWorkspaceCount: linkedWorkspaces.length,
              unassignedWorkspaceCount,
              linkedGroupLabels: [...new Set(linkedGroupLabels)],
            },
          ];
        }),
      ),
    [entries, studentDatabase, workspaces],
  );

  return (
    <Card
      title="Erwartungshorizont-Archiv"
      subtitle="Gespeicherte Bewertungsbögen zum Wiederverwenden, Öffnen oder Duplizieren."
    >
      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <Field label="Suche">
          <input className="field" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Titel, Lehrkraft, Kurs ..." />
        </Field>
        <Field label="Schuljahr">
          <select className="field" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
            <option value="">Alle</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Klasse">
          <select className="field" value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
            <option value="">Alle</option>
            {grades.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="surface-muted mb-5 grid gap-3 rounded-3xl p-4 sm:grid-cols-3">
        <div>
          <p className="label">Einträge</p>
          <p className="themed-strong text-xl font-semibold">{filteredEntries.length}</p>
        </div>
        <div>
          <p className="label">Schuljahre</p>
          <p className="themed-strong text-xl font-semibold">{years.length}</p>
        </div>
        <div>
          <p className="label">Klassenstufen</p>
          <p className="themed-strong text-xl font-semibold">{grades.length}</p>
        </div>
      </div>

      <div
        className="overflow-hidden rounded-3xl border"
        style={{
          borderColor: "var(--app-secondary-border)",
          background: "var(--app-secondary-bg)",
        }}
      >
        <div className="overflow-x-auto">
        <table className="min-w-[980px] text-sm md:min-w-full">
          <thead
            className="text-left text-xs uppercase tracking-[0.16em]"
            style={{
              background: "color-mix(in srgb, var(--app-secondary-hover) 78%, transparent)",
              color: "var(--app-label)",
              borderBottom: "1px solid var(--app-secondary-border)",
            }}
          >
            <tr>
              <th className="px-4 py-3">Klasse / Jahr / Datum</th>
              <th className="px-4 py-3">Vorlage</th>
              <th className="px-4 py-3">Struktur</th>
              <th className="px-4 py-3">Punkte / Horizonte</th>
              <th className="px-4 py-3 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody
            style={{
              background: "var(--app-secondary-bg)",
              color: "var(--app-text)",
            }}
          >
            {filteredEntries.map((entry) => {
              const progress = progressByEntryId.get(entry.id) ?? {
                completedStudents: 0,
                studentCount: 0,
                progress: 0,
                linkedWorkspaceCount: 0,
                unassignedWorkspaceCount: 0,
                linkedGroupLabels: [],
              };

              return (
                <Fragment key={entry.id}>
                  <tr className="align-top" style={{ borderTop: "1px solid var(--app-border-default)" }}>
                    <td className="px-4 py-3" style={{ color: "var(--app-text)" }}>
                      <p className="font-semibold" style={{ color: "var(--app-text-strong)" }}>{entry.gradeLevel} · {entry.course}</p>
                      <p>{entry.schoolYear}</p>
                      <p>{entry.examDate}</p>
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--app-text)" }}>
                      <p className="font-semibold" style={{ color: "var(--app-text-strong)" }}>{entry.examTitle}</p>
                      <p>{entry.teacher}</p>
                      <p className="mt-2 text-xs" style={{ color: "var(--app-label)" }}>Gespeichert: {formatDateTime(entry.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--app-text)" }}>
                      <p className="max-w-2xl whitespace-pre-line leading-6">{entry.summaryText}</p>
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--app-text)" }}>
                      <p className="font-semibold" style={{ color: "var(--app-text-strong)" }}>{formatNumber(entry.totalMaxPoints, 0)} Punkte</p>
                      <p>{entry.sectionCount} Abschnitte</p>
                      <p>{entry.expectationCount} Erwartungshorizonte</p>
                      {progress.linkedGroupLabels.length > 0 && (
                        <p className="mt-2 text-xs" style={{ color: "var(--app-label)" }}>
                          Zugeordnet: {progress.linkedGroupLabels.join(", ")}
                        </p>
                      )}
                      <p className="mt-2 text-xs" style={{ color: "var(--app-label)" }}>
                        {progress.studentCount > 0
                          ? `${progress.completedStudents} / ${progress.studentCount} Korrekturen fertig`
                          : progress.linkedWorkspaceCount > 0
                            ? progress.unassignedWorkspaceCount === progress.linkedWorkspaceCount
                              ? "Bereits geöffnet, aber noch keiner Lerngruppe zugeordnet"
                              : "Verknüpft, aber ohne aktive Schüler"
                            : "Noch nicht verwendet"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button type="button" className="button-primary gap-2" onClick={() => onOpen(entry)}>
                          <OpenIcon />
                          Im Builder öffnen
                        </button>
                        <button type="button" className="button-secondary gap-2" onClick={() => onDuplicateToBuilder(entry)}>
                          <DuplicateIcon />
                          Als Kopie öffnen
                        </button>
                        <button type="button" className="button-soft gap-2" onClick={() => onDelete(entry)}>
                          <TrashIcon />
                          Löschen
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr aria-hidden="true">
                    <td colSpan={5} className="p-0">
                      <div
                        className="h-1.5 w-full"
                        style={{
                          background: "color-mix(in srgb, var(--app-border-default) 72%, transparent)",
                        }}
                      >
                        <div
                          className="h-full transition-all duration-300"
                          style={{
                            width: `${progress.progress * 100}%`,
                            background: "color-mix(in srgb, var(--app-field-focus) 42%, transparent)",
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                </Fragment>
              );
            })}
            {filteredEntries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center" style={{ color: "var(--app-label)" }}>
                  Noch keine passenden Archiv-Einträge vorhanden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </Card>
  );
};
