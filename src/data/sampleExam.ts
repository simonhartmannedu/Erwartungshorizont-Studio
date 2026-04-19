import { Exam } from "../types";
import { createReadingExamTemplate } from "./templates";

export const sampleExam: Exam = (() => {
  const exam = createReadingExamTemplate();
  exam.meta.title = "Englisch-Klassenarbeit Unit 4";
  exam.meta.unit = "Unit 4 · New Media and Communication";
  exam.meta.teacher = "M. Beispiel";
  exam.meta.gradeLevel = "8";
  exam.meta.course = "8b";
  exam.meta.examDate = "2026-03-23";
  exam.meta.notes =
    "Bewertung gemäß schulinterner Englisch-Fachkonferenz. Alle Teilbereiche bleiben vollständig editierbar.";
  exam.evaluationMode = "direct";
  exam.sections[0].tasks[0].achievedPoints = 8;
  exam.sections[0].tasks[1].achievedPoints = 7;
  exam.sections[0].tasks[2].achievedPoints = 6;
  exam.sections[1].tasks[0].achievedPoints = 15;
  exam.sections[2].tasks[0].achievedPoints = 8;
  exam.sections[2].tasks[1].achievedPoints = 7;
  exam.sections[3].tasks[0].achievedPoints = 6.5;
  exam.sections[3].tasks[1].achievedPoints = 6.5;
  exam.sections[3].tasks[2].achievedPoints = 7;
  exam.sections[3].tasks[3].achievedPoints = 6.5;
  return exam;
})();
