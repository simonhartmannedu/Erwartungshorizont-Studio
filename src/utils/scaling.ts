import { Exam, Section, Task } from "../types";
import { getSectionMaxPoints } from "./calculations";
import { normalizeWritingSection } from "./writing";

interface WeightedItem<T> {
  value: T;
  basePoints: number;
}

const POINT_STEP = 0.5;

const largestRemainderAllocation = <T,>(
  items: WeightedItem<T>[],
  targetTotal: number,
): Array<{ value: T; allocated: number }> => {
  const safeUnits = Math.max(0, Math.round(targetTotal / POINT_STEP));
  const baseTotal = items.reduce((sum, item) => sum + item.basePoints, 0);

  if (items.length === 0) return [];
  if (baseTotal === 0) {
    const evenBase = Math.floor(safeUnits / items.length);
    let remainder = safeUnits - evenBase * items.length;
    return items.map((item) => {
      const allocated = evenBase + (remainder > 0 ? 1 : 0);
      remainder = Math.max(0, remainder - 1);
      return { value: item.value, allocated: allocated * POINT_STEP };
    });
  }

  const scaled = items.map((item) => {
    const exact = (item.basePoints / baseTotal) * safeUnits;
    const floor = Math.floor(exact);
    return { item: item.value, floor, remainder: exact - floor };
  });

  let remaining = safeUnits - scaled.reduce((sum, item) => sum + item.floor, 0);
  scaled
    .sort((a, b) => b.remainder - a.remainder)
    .forEach((entry) => {
      if (remaining <= 0) return;
      entry.floor += 1;
      remaining -= 1;
    });

  return scaled.map((entry) => ({ value: entry.item, allocated: entry.floor * POINT_STEP }));
};

const allocateTasks = (tasks: Task[], targetTotal: number) =>
  largestRemainderAllocation(
    tasks.map((task) => ({ value: task, basePoints: task.maxPoints })),
    targetTotal,
  );

const cloneTask = (task: Task, maxPoints: number, achievedPoints: number): Task => ({
  ...task,
  maxPoints,
  achievedPoints,
});

export const scaleExamPoints = (
  exam: Exam,
  targetTotal: number,
  scaleAchievedPoints: boolean,
): Exam => {
  const sectionAllocations = largestRemainderAllocation(
    exam.sections.map((section) => ({
      value: section,
      basePoints: getSectionMaxPoints(section),
    })),
    targetTotal,
  );

  const sections: Section[] = sectionAllocations.map(({ value: section, allocated }) => {
    const taskAllocations = allocateTasks(section.tasks, allocated);
    const achievedAllocations = scaleAchievedPoints
      ? largestRemainderAllocation(
          section.tasks.map((task) => ({
            value: task.id,
            basePoints: task.achievedPoints,
          })),
          Math.min(
            allocated,
            Math.round(
              section.tasks.reduce((sum, task) => sum + task.achievedPoints, 0) *
                (allocated / Math.max(1, getSectionMaxPoints(section))),
            ),
          ),
        )
      : [];
    const scaledTasks = taskAllocations.map(({ value: task, allocated: taskPoints }) => {
      const achievedPoints = scaleAchievedPoints
        ? achievedAllocations.find((entry) => entry.value === task.id)?.allocated ?? task.achievedPoints
        : task.achievedPoints;

      return cloneTask(task, taskPoints, achievedPoints);
    });

    const normalizedSection = normalizeWritingSection({
      ...section,
      maxPointsOverride: null,
      tasks: scaledTasks,
    });

    return {
      ...normalizedSection,
      tasks: normalizedSection.tasks.map((task) => ({
        ...task,
        achievedPoints: Math.min(task.achievedPoints, task.maxPoints),
      })),
    };
  });

  return {
    ...exam,
    sections,
  };
};
