import { Fragment, useMemo, useState } from "react";
import { DraftWorkspace, ExpectationArchiveEntry, StudentDatabase } from "../types";
import { formatDateTime, formatNumber } from "../utils/format";
import { getStudentAssessment } from "../utils/students";
import { CheckIcon, ChevronDownIcon, CloseIcon, DuplicateIcon, GroupIcon, OpenIcon, TrashIcon } from "./icons";
import { Card, Field, IconButton } from "./ui";

interface Props {
  entries: ExpectationArchiveEntry[];
  studentDatabase: StudentDatabase;
  workspaces: DraftWorkspace[];
  onOpen: (entry: ExpectationArchiveEntry) => void;
  onDuplicateToBuilder: (entry: ExpectationArchiveEntry) => void;
  onAssignCopyToGroup: (entry: ExpectationArchiveEntry, groupId: string) => void;
  onDelete: (entry: ExpectationArchiveEntry) => void;
}

export const ExpectationArchiveDashboard = ({
  entries,
  studentDatabase,
  workspaces,
  onOpen,
  onDuplicateToBuilder,
  onAssignCopyToGroup,
  onDelete,
}: Props) => {
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [sortBy, setSortBy] = useState<"savedAt" | "grade" | "title" | "points">("savedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [assigningEntryId, setAssigningEntryId] = useState<string | null>(null);
  const [selectedGroupByEntryId, setSelectedGroupByEntryId] = useState<Record<string, string>>({});

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
    const visibleEntries = entries.filter((entry) => {
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

    const directionFactor = sortDirection === "asc" ? 1 : -1;

    return [...visibleEntries].sort((left, right) => {
      switch (sortBy) {
        case "grade":
          return directionFactor * `${left.gradeLevel} ${left.course} ${left.schoolYear}`.localeCompare(
            `${right.gradeLevel} ${right.course} ${right.schoolYear}`,
            "de-DE",
            { numeric: true, sensitivity: "base" },
          );
        case "title":
          return directionFactor * left.examTitle.localeCompare(right.examTitle, "de-DE", {
            numeric: true,
            sensitivity: "base",
          });
        case "points":
          return directionFactor * (left.totalMaxPoints - right.totalMaxPoints);
        case "savedAt":
        default:
          return directionFactor * (new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
      }
    });
  }, [entries, gradeFilter, search, sortBy, sortDirection, yearFilter]);

  const handleSort = (nextSortBy: typeof sortBy) => {
    if (sortBy === nextSortBy) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortBy(nextSortBy);
    setSortDirection(nextSortBy === "title" || nextSortBy === "grade" ? "asc" : "desc");
  };

  const renderSortLabel = (label: string, columnSortBy: typeof sortBy) => (
    <button
      type="button"
      className="inline-flex items-center gap-1 font-semibold"
      onClick={() => handleSort(columnSortBy)}
      title={`Nach ${label} sortieren`}
    >
      <span>{label}</span>
      <ChevronDownIcon
        className={`h-3.5 w-3.5 transition-transform ${
          sortBy === columnSortBy && sortDirection === "asc" ? "rotate-180" : ""
        }`}
      />
    </button>
  );

  const progressByEntryId = useMemo(
    () =>
      new Map(
        entries.map((entry) => {
          const linkedWorkspaces = workspaces.filter(
            (workspace, index, allWorkspaces) =>
              workspace.activeArchiveEntryId === entry.id &&
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

  const getSelectedGroupId = (entryId: string) => selectedGroupByEntryId[entryId] ?? "";

  return (
    <Card
      title="Erwartungshorizont-Archiv"
      subtitle="Gespeicherte Bewertungsbögen zum Wiederverwenden, Öffnen oder Duplizieren."
    >
      <div className="mb-5 grid gap-3 md:grid-cols-4">
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
        <Field label="Sortierung">
          <select
            className="field"
            value={`${sortBy}:${sortDirection}`}
            onChange={(event) => {
              const [nextSortBy, nextSortDirection] = event.target.value.split(":") as [typeof sortBy, typeof sortDirection];
              setSortBy(nextSortBy);
              setSortDirection(nextSortDirection);
            }}
          >
            <option value="savedAt:desc">Zuletzt gespeichert</option>
            <option value="savedAt:asc">Zuerst gespeichert</option>
            <option value="title:asc">Titel A-Z</option>
            <option value="title:desc">Titel Z-A</option>
            <option value="grade:asc">Klasse A-Z</option>
            <option value="grade:desc">Klasse Z-A</option>
            <option value="points:desc">Meiste Punkte</option>
            <option value="points:asc">Wenigste Punkte</option>
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
              <th className="px-4 py-3">{renderSortLabel("Klasse / Jahr / Datum", "grade")}</th>
              <th className="px-4 py-3">{renderSortLabel("Vorlage", "title")}</th>
              <th className="px-4 py-3">Struktur</th>
              <th className="px-4 py-3">{renderSortLabel("Punkte / Horizonte", "points")}</th>
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
                      <div className="flex flex-wrap justify-end gap-2">
                        <IconButton
                          onClick={() => onOpen(entry)}
                          title="Im Builder öffnen"
                          className="px-3 py-2"
                        >
                          <OpenIcon />
                        </IconButton>
                        {assigningEntryId === entry.id ? (
                          <>
                            <label className="min-w-[240px]">
                              <span className="sr-only">Lerngruppe auswählen</span>
                              <select
                                className="field"
                                value={getSelectedGroupId(entry.id)}
                                onChange={(event) =>
                                  setSelectedGroupByEntryId((current) => ({
                                    ...current,
                                    [entry.id]: event.target.value,
                                  }))
                                }
                                disabled={studentDatabase.groups.length === 0}
                              >
                                <option value="">Lerngruppe wählen</option>
                                {studentDatabase.groups.map((group) => (
                                  <option key={group.id} value={group.id}>
                                    {group.subject} · {group.className}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <IconButton
                              onClick={() => {
                                onAssignCopyToGroup(entry, getSelectedGroupId(entry.id));
                                setAssigningEntryId(null);
                              }}
                              title="Ausgewählter Lerngruppe zuordnen"
                              className="px-3 py-2"
                            >
                              <CheckIcon />
                            </IconButton>
                            <IconButton
                              onClick={() => {
                                setAssigningEntryId(null);
                                setSelectedGroupByEntryId((current) => ({
                                  ...current,
                                  [entry.id]: "",
                                }));
                              }}
                              title="Zuordnung abbrechen"
                              variant="soft"
                              className="px-3 py-2"
                            >
                              <CloseIcon />
                            </IconButton>
                          </>
                        ) : (
                          <IconButton
                            onClick={() => {
                              setAssigningEntryId(entry.id);
                              setSelectedGroupByEntryId((current) => ({
                                ...current,
                                [entry.id]: current[entry.id] ?? "",
                              }));
                            }}
                            title="Lerngruppe zuordnen"
                            className="px-3 py-2"
                          >
                            <GroupIcon />
                          </IconButton>
                        )}
                        <IconButton
                          onClick={() => onDuplicateToBuilder(entry)}
                          title="Als Kopie öffnen"
                          className="px-3 py-2"
                        >
                          <DuplicateIcon />
                        </IconButton>
                        <IconButton
                          onClick={() => onDelete(entry)}
                          title="Archiv-Eintrag löschen"
                          variant="soft"
                          className="px-3 py-2"
                        >
                          <TrashIcon />
                        </IconButton>
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
