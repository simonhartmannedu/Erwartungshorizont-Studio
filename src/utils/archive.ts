import { Exam, ExpectationArchiveEntry } from "../types";
import { calculateExamSummary } from "./calculations";
import { cloneExam } from "./exam";

const resetExamIds = (exam: Exam, titleSuffix = ""): Exam => ({
  ...cloneExam(exam),
  id: crypto.randomUUID(),
  meta: {
    ...exam.meta,
    title: titleSuffix ? `${exam.meta.title}${titleSuffix}` : exam.meta.title,
  },
  gradeScale: {
    ...exam.gradeScale,
    id: crypto.randomUUID(),
    bands: exam.gradeScale.bands.map((band) => ({
      ...band,
      id: crypto.randomUUID(),
    })),
  },
  sections: exam.sections.map((section) => ({
    ...section,
    id: crypto.randomUUID(),
    tasks: section.tasks.map((task) => ({
      ...task,
      id: crypto.randomUUID(),
    })),
  })),
});

export const buildArchiveEntryFromExam = (exam: Exam): ExpectationArchiveEntry => {
  const summary = calculateExamSummary(exam);
  const expectationCount = exam.sections.reduce(
    (sum, section) => sum + section.tasks.filter((task) => task.expectation.trim()).length,
    0,
  );

  return {
    id: crypto.randomUUID(),
    examId: exam.id,
    examTitle: exam.meta.title,
    schoolYear: exam.meta.schoolYear,
    gradeLevel: exam.meta.gradeLevel,
    course: exam.meta.course,
    teacher: exam.meta.teacher,
    examDate: exam.meta.examDate,
    sectionCount: exam.sections.length,
    totalMaxPoints: summary.totalMaxPoints,
    expectationCount,
    summaryText: exam.sections.map((section) => section.title).join(" · "),
    examSnapshot: cloneExam(exam),
    createdAt: new Date().toISOString(),
  };
};

export const mergeArchiveEntries = (
  existing: ExpectationArchiveEntry[],
  incoming: ExpectationArchiveEntry[],
) => {
  const map = new Map<string, ExpectationArchiveEntry>();
  [...existing, ...incoming].forEach((entry) => {
    map.set(entry.id, entry);
  });

  return [...map.values()].sort((a, b) => {
    if (a.schoolYear !== b.schoolYear) return b.schoolYear.localeCompare(a.schoolYear);
    if (a.examDate !== b.examDate) return b.examDate.localeCompare(a.examDate);
    return a.gradeLevel.localeCompare(b.gradeLevel, "de");
  });
};

export const createEditableExamFromArchive = (
  entry: ExpectationArchiveEntry,
  options?: { duplicate?: boolean },
) => {
  if (options?.duplicate) {
    return resetExamIds(entry.examSnapshot, " Kopie");
  }

  return cloneExam(entry.examSnapshot);
};

export const isArchiveEntry = (value: unknown): value is ExpectationArchiveEntry => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ExpectationArchiveEntry>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.examTitle === "string" &&
    typeof candidate.schoolYear === "string" &&
    typeof candidate.gradeLevel === "string" &&
    typeof candidate.examDate === "string" &&
    typeof candidate.sectionCount === "number" &&
    typeof candidate.totalMaxPoints === "number" &&
    typeof candidate.expectationCount === "number" &&
    typeof candidate.summaryText === "string" &&
    typeof candidate.createdAt === "string" &&
    Boolean(candidate.examSnapshot && typeof candidate.examSnapshot === "object")
  );
};
