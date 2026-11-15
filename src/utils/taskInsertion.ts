import type { Section, Task, StudentAssessment } from "../types";

export type InsertionTarget = {
  sectionId: string;
  taskId: string | null;
  position: "before" | "after" | "end";
};

export type InsertionSection = Pick<Section, "id" | "title" | "tasks">;

/** Resolve IDs only at commit time. Never fall back to a different destination. */
export const resolveInsertionPosition = (sections: InsertionSection[], target: InsertionTarget) => {
  const section = sections.find((entry) => entry.id === target.sectionId);
  if (!section) return null;
  if (target.position === "end") return { section, index: section.tasks.length };
  const index = section.tasks.findIndex((task) => task.id === target.taskId);
  return index < 0 ? null : { section, index: index + (target.position === "after" ? 1 : 0) };
};

export const describeInsertionTarget = (sections: InsertionSection[], target: InsertionTarget) => {
  const resolved = resolveInsertionPosition(sections, target);
  if (!resolved) return "Die Einfügestelle ist nicht mehr vorhanden. Bitte wähle die Stelle erneut.";
  const sectionIndex = sections.findIndex((section) => section.id === target.sectionId);
  const part = `Teil ${String.fromCharCode(65 + sectionIndex)}`;
  if (target.position === "end") return `${part} · am Ende`;
  const taskIndex = resolved.section.tasks.findIndex((task) => task.id === target.taskId);
  return `${part} · ${target.position === "before" ? "vor" : "nach"} Aufgabe ${taskIndex + 1}`;
};

/** Only rubric fields belong in a copy, never scores or answer-sheet associations. */
export const copyTaskForInsertion = (task: Task, category: string): Task => ({
  id: crypto.randomUUID(),
  title: task.title,
  description: task.description,
  expectation: task.expectation,
  maxPoints: task.maxPoints,
  category,
  achievedPoints: 0,
});

export const insertTaskAtTarget = <T extends InsertionSection>(sections: T[], target: InsertionTarget, task: Task): T[] | null => {
  const resolved = resolveInsertionPosition(sections, target);
  if (!resolved) return null;
  return sections.map((section) => section.id === target.sectionId ? {
    ...section,
    tasks: [...section.tasks.slice(0, resolved.index), task, ...section.tasks.slice(resolved.index)],
  } : section);
};

export const getInsertionAssessmentState = (assessments: StudentAssessment[]) => ({
  hasScores: assessments.some((assessment) => Object.keys(assessment.taskScores).length > 0),
  uncertain: assessments.some((assessment) => Boolean(assessment.encryptedTaskScores)),
});

export const canUndoTaskInsertion = (taskId: string, assessments: StudentAssessment[], linkedTaskIds: Array<string | null>) =>
  !linkedTaskIds.includes(taskId) && !assessments.some((assessment) =>
    Boolean(assessment.encryptedTaskScores) || Object.prototype.hasOwnProperty.call(assessment.taskScores, taskId));
