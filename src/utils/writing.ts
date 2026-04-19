import { Exam, Section } from "../types";
import { round } from "./format";

const POINT_STEP = 0.5;
const POINT_DIGITS = 1;

const roundPoints = (value: number) => round(Math.max(0, value), POINT_DIGITS);

export interface WritingLanguageMetrics {
  totalPoints: number;
  languagePoints: number;
  targetLanguagePoints: number;
  languageShare: number;
  isCompliant: boolean;
}

export const allocatePointsByRatio = <T,>(
  items: Array<{ value: T; basePoints: number }>,
  targetTotal: number,
  step = POINT_STEP,
): Array<{ value: T; allocated: number }> => {
  const safeStep = step > 0 ? step : POINT_STEP;
  const safeUnits = Math.max(0, Math.round(targetTotal / safeStep));
  const baseTotal = items.reduce((total, item) => total + Math.max(0, item.basePoints), 0);

  if (items.length === 0) return [];

  if (baseTotal === 0) {
    const evenUnits = Math.floor(safeUnits / items.length);
    let remainingUnits = safeUnits - evenUnits * items.length;
    return items.map((item) => {
      const allocatedUnits = evenUnits + (remainingUnits > 0 ? 1 : 0);
      remainingUnits = Math.max(0, remainingUnits - 1);
      return { value: item.value, allocated: roundPoints(allocatedUnits * safeStep) };
    });
  }

  const scaled = items.map((item) => {
    const exactUnits = (Math.max(0, item.basePoints) / baseTotal) * safeUnits;
    const floorUnits = Math.floor(exactUnits);
    return {
      item: item.value,
      floorUnits,
      remainder: exactUnits - floorUnits,
    };
  });

  let remainingUnits = safeUnits - scaled.reduce((total, item) => total + item.floorUnits, 0);
  scaled
    .sort((left, right) => right.remainder - left.remainder)
    .forEach((entry) => {
      if (remainingUnits <= 0) return;
      entry.floorUnits += 1;
      remainingUnits -= 1;
    });

  return scaled.map((entry) => ({
    value: entry.item,
    allocated: roundPoints(entry.floorUnits * safeStep),
  }));
};

export const isWritingSection = (_section: Section) => false;

export const getWritingLanguageMetrics = (_section: Section): WritingLanguageMetrics | null => null;

export const normalizeWritingSection = (section: Section): Section => section;

export const normalizeExamWritingSections = (exam: Exam): Exam => exam;

export const scaleSectionTasksToTotal = (section: Section, targetTotal: number): Section => {
  const allocations = allocatePointsByRatio(
    section.tasks.map((task) => ({ value: task.id, basePoints: task.maxPoints })),
    targetTotal,
  );
  const allocationMap = new Map(allocations.map((entry) => [entry.value, entry.allocated]));

  return {
    ...section,
    maxPointsOverride: null,
    tasks: section.tasks.map((task) => {
      const maxPoints = allocationMap.get(task.id) ?? 0;
      const ratio = task.maxPoints > 0 ? task.achievedPoints / task.maxPoints : 0;
      const achievedPoints = roundPoints(Math.min(maxPoints, maxPoints * ratio));

      return {
        ...task,
        maxPoints,
        achievedPoints,
      };
    }),
  };
};
