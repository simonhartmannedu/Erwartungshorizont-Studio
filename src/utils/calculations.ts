import { Exam, ExamSummary, Section, SectionResult } from "../types";
import { getNextGradeProgress, resolveGrade } from "./grades";
import { clamp } from "./format";
import { getEffectiveGradeScaleMode } from "./gradeScaleGenerator";
import { validateExam } from "./validation";

const safeNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const sum = (values: number[]) => values.reduce((acc, value) => acc + safeNumber(value), 0);

export const getSectionMaxPoints = (section: Section) =>
  safeNumber(section.maxPointsOverride) > 0
    ? safeNumber(section.maxPointsOverride)
    : sum(section.tasks.map((task) => safeNumber(task.maxPoints)));

export const getSectionAchievedPoints = (section: Section) =>
  sum(section.tasks.map((task) => safeNumber(task.achievedPoints)));

export const calculateSectionResult = (section: Section): SectionResult => {
  const maxPoints = getSectionMaxPoints(section);
  const achievedPoints = getSectionAchievedPoints(section);
  const percentage = maxPoints > 0 ? clamp((achievedPoints / maxPoints) * 100, 0, 100) : 0;
  const weightedPercentage = percentage * (safeNumber(section.weight) / 100);

  return {
    sectionId: section.id,
    maxPoints,
    achievedPoints,
    percentage,
    weightedPercentage,
  };
};

export const calculateExamSummary = (exam: Exam): ExamSummary => {
  const sectionResults = exam.sections.map(calculateSectionResult);
  const totalMaxPoints = sum(sectionResults.map((section) => section.maxPoints));
  const totalAchievedPoints = sum(sectionResults.map((section) => section.achievedPoints));
  const rawPercentage = totalMaxPoints > 0 ? (totalAchievedPoints / totalMaxPoints) * 100 : 0;
  const weightedPercentage = sum(sectionResults.map((section) => section.weightedPercentage));
  const finalPercentage = clamp(rawPercentage, 0, 100);
  const referenceValue =
    getEffectiveGradeScaleMode(exam.gradeScale) === "points" ? totalAchievedPoints : clamp(finalPercentage, 0, 100);
  const grade = resolveGrade(exam.gradeScale, referenceValue, totalMaxPoints);
  const nextGradeProgress = getNextGradeProgress({
    scale: exam.gradeScale,
    referenceValue,
    totalAchievedPoints,
    totalMaxPoints,
  });

  return {
    totalMaxPoints,
    totalAchievedPoints,
    rawPercentage,
    weightedPercentage,
    finalPercentage,
    sectionResults,
    grade,
    nextGradeProgress,
    issues: validateExam(exam, sectionResults),
  };
};
