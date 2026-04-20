import { Exam, ExamMeta } from "../types";

export const createEmptyExamMeta = (): ExamMeta => ({
  schoolYear: "",
  gradeLevel: "",
  course: "",
  teacher: "",
  examDate: "",
  title: "",
  unit: "",
  notes: "",
});

export const cloneExam = (exam: Exam): Exam => JSON.parse(JSON.stringify(exam)) as Exam;

export const withExamMeta = (exam: Exam, meta: ExamMeta): Exam => ({
  ...cloneExam(exam),
  meta: {
    ...meta,
  },
});
