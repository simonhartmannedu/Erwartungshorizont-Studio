import { useEffect, useMemo, useRef, useState } from "react";
import type { Exam, StudentDatabase, StudentRecord } from "../types";
import { getStudentAssessment, getStudentParticipationStatus } from "../utils/students";
import { NumberInput } from "./ui";

type Props = {
  exam: Exam;
  database: StudentDatabase;
  workspaceId: string;
  students: StudentRecord[];
  studentNames: Record<string, string>;
  activeStudentId: string;
  scoresLocked: boolean;
  onSelectStudent: (studentId: string) => void;
  onScoreChange: (studentId: string, taskId: string, score: number) => void;
  onLockedScoreAttempt: () => void;
};

const formatPoints = (value: number) =>
  new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(value);

const participationLabel = (status: ReturnType<typeof getStudentParticipationStatus>) => ({
  absent: "abwesend",
  excused: "entschuldigt",
  makeup: "schreibt nach",
  present: "anwesend",
})[status];

/** A task-focused correction surface which complements the existing student view. */
export const CorrectionDesk = ({
  exam,
  database,
  workspaceId,
  students,
  studentNames,
  activeStudentId,
  scoresLocked,
  onSelectStudent,
  onScoreChange,
  onLockedScoreAttempt,
}: Props) => {
  const rootRef = useRef<HTMLElement | null>(null);
  const tasks = useMemo(
    () => exam.sections.flatMap((section, sectionIndex) =>
      section.tasks.map((task, taskIndex) => ({
        ...task,
        label: `${sectionIndex + 1}.${taskIndex + 1}`,
        sectionTitle: section.title.trim() || `Abschnitt ${sectionIndex + 1}`,
      })),
    ),
    [exam.sections],
  );
  const [selectedTaskId, setSelectedTaskId] = useState(() => tasks[0]?.id ?? "");

  useEffect(() => {
    if (!tasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(tasks[0]?.id ?? "");
    }
  }, [selectedTaskId, tasks]);

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
  const rows = useMemo(
    () => students.map((student) => {
      const assessment = getStudentAssessment(database, student.id, workspaceId);
      const participationStatus = getStudentParticipationStatus(database, student.id, workspaceId);
      const hasScore = selectedTask
        ? Object.prototype.hasOwnProperty.call(assessment.taskScores, selectedTask.id)
        : false;
      return {
        student,
        participationStatus,
        hasScore,
        score: selectedTask ? assessment.taskScores[selectedTask.id] : undefined,
      };
    }),
    [database, selectedTask, students, workspaceId],
  );
  const participatingRows = rows.filter((row) => row.participationStatus === "present");
  const scoredCount = participatingRows.filter((row) => row.hasScore).length;
  const openRow = participatingRows.find((row) => !row.hasScore) ?? null;

  const focusScoreFor = (studentId: string) => {
    const input = rootRef.current?.querySelector<HTMLInputElement>(`#correction-desk-score-${studentId}`);
    input?.focus();
    input?.select();
  };

  const advanceToNextScore = (source: HTMLInputElement) => {
    const inputs = Array.from(rootRef.current?.querySelectorAll<HTMLInputElement>(".correction-desk-score:not(:disabled)") ?? []);
    const nextInput = inputs[inputs.indexOf(source) + 1];
    if (!nextInput) return;
    requestAnimationFrame(() => {
      nextInput.scrollIntoView({ behavior: "auto", block: "nearest", inline: "nearest" });
      nextInput.focus();
      nextInput.select();
    });
  };

  if (!selectedTask) {
    return (
      <section className="rounded-2xl border p-5 surface-muted" aria-labelledby="correction-desk-title">
        <h2 id="correction-desk-title" className="themed-strong text-lg font-semibold">Korrektur-Tisch</h2>
        <p className="themed-muted mt-2 text-sm leading-6">Lege mindestens eine Aufgabe an, damit die Punkte zeilenweise erfasst werden können.</p>
      </section>
    );
  }

  return (
    <section ref={rootRef} className="space-y-4" aria-labelledby="correction-desk-title">
      <div className="rounded-2xl border p-5 surface-muted">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label">Korrektur-Tisch</p>
            <h2 id="correction-desk-title" className="themed-strong text-lg font-semibold">Eine Aufgabe für die ganze Lerngruppe</h2>
            <p className="themed-muted mt-1 text-sm leading-6">Mit Enter geht es zur nächsten Punkteingabe. Die Einzelkorrektur bleibt über den Modus-Umschalter erreichbar.</p>
          </div>
          <div className="text-right">
            <p className="themed-strong text-lg font-semibold">{scoredCount} / {participatingRows.length}</p>
            <p className="themed-muted text-xs">Punkteingaben erfasst</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block min-w-[15rem] flex-1">
            <span className="label">Aufgabe</span>
            <select className="field" value={selectedTaskId} onChange={(event) => setSelectedTaskId(event.target.value)}>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>{task.label} · {task.sectionTitle} · {task.title || "Unbenannte Aufgabe"} ({formatPoints(task.maxPoints)} P.)</option>
              ))}
            </select>
          </label>
          {scoresLocked ? (
            <button type="button" className="button-primary" onClick={onLockedScoreAttempt}>Klasse entsperren</button>
          ) : (
            <button type="button" className="button-secondary" disabled={!openRow} onClick={() => openRow && focusScoreFor(openRow.student.id)}>
              Nächste offene Eingabe
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <caption className="sr-only">Punkte für {selectedTask.label}: {selectedTask.title || "Unbenannte Aufgabe"}</caption>
          <colgroup>
            <col />
            <col className="w-36" />
            <col className="w-28" />
          </colgroup>
          <thead className="surface-muted"><tr>
            <th scope="col" className="px-4 py-3 font-semibold">Schülercode</th>
            <th scope="col" className="correction-desk-score-heading whitespace-nowrap px-4 py-3 text-right font-semibold">Punkte / {formatPoints(selectedTask.maxPoints)}</th>
            <th scope="col" className="whitespace-nowrap px-4 py-3 font-semibold">Status</th>
          </tr></thead>
          <tbody>
            {rows.map(({ student, participationStatus, hasScore, score }) => {
              const participates = participationStatus === "present";
              const fullName = studentNames[student.id]?.trim();
              const studentLabel = fullName ? `${fullName} · ${student.alias}` : student.alias;
              return (
                <tr key={student.id} className="border-t">
                  <th scope="row" className="px-4 py-3 font-medium">
                    <button type="button" className="text-left underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current" aria-label={`${studentLabel} für die Einzelkorrektur auswählen`} aria-pressed={activeStudentId === student.id} onClick={() => onSelectStudent(student.id)}>
                      {fullName ? <><span className="block">{fullName}</span><span className="themed-muted text-xs font-normal">{student.alias}</span></> : student.alias}
                    </button>
                  </th>
                  <td className="correction-desk-score-cell px-4 py-2 text-right">
                    {participates ? (
                      <NumberInput
                        value={score ?? 0}
                        min={0}
                        step={0.5}
                        ariaLabel={`${studentLabel}: Punkte für Aufgabe ${selectedTask.label}`}
                        inputId={`correction-desk-score-${student.id}`}
                        className="field correction-desk-score ml-auto w-24 px-2 py-2 text-right font-semibold"
                        disabled={scoresLocked}
                        commitOnChange
                        onCommit={(nextScore) => onScoreChange(student.id, selectedTask.id, nextScore)}
                        onAdvance={advanceToNextScore}
                      />
                    ) : <span className="themed-muted text-xs">keine Eingabe</span>}
                  </td>
                  <td className="themed-muted px-4 py-3">{participates ? (hasScore ? "erfasst" : "offen") : participationLabel(participationStatus)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};
