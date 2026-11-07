import { describe, expect, it } from "vitest";
import { sampleExam } from "../data/sampleExam";
import type { Exam, StudentAssessment, StudentDatabase } from "../types";
import { confirmCorrectionReview, getCorrectionCheck, getTaskRubricSignatures } from "./correctionReview";
import { updateStudentScore } from "./students";

const exam = (): Exam => ({ ...structuredClone(sampleExam), sections: [{ ...structuredClone(sampleExam.sections[0]), tasks: structuredClone(sampleExam.sections[0].tasks.slice(0, 2)) }] });
const assessment = (work: Exam): StudentAssessment => ({
  workspaceId: "work", studentId: "student", taskScores: Object.fromEntries(work.sections[0].tasks.map((task) => [task.id, 0])),
  teacherComment: "Individueller Kommentar", updatedAt: "2026-11-07T10:00:00.000Z", printedAt: null,
});

describe("Abschlussprüfung", () => {
  it("unterscheidet ausdrücklich erfasste null Punkte von fehlenden Punkten und verhindert vorzeitiges Bestätigen", () => {
    const work = exam();
    const current = assessment(work);
    const missingId = work.sections[0].tasks[1].id;
    delete current.taskScores[missingId];
    expect(getCorrectionCheck(work, current).missingTaskIds).toEqual([missingId]);
    expect(confirmCorrectionReview(work, current)).toBeUndefined();
    expect(getCorrectionCheck(work, assessment(work)).missingTaskIds).toEqual([]);
  });

  it("behandelt alte Bewertungen als unbestätigt und bestätigt sie ohne Veränderung der Punkte", () => {
    const work = exam();
    const current = assessment(work);
    expect(getCorrectionCheck(work, current).unverifiedTaskIds).toHaveLength(2);
    const checked = { ...current, correctionReview: confirmCorrectionReview(work, current) };
    expect(getCorrectionCheck(work, checked).complete).toBe(true);
    expect(checked.taskScores).toEqual(current.taskScores);
    expect(getCorrectionCheck(work, checked).unverifiedTaskIds).toEqual([]);
  });

  it("erkennt geänderte Kriterien und Notenschlüssel auch nach einem erneuten Laden", () => {
    const work = exam();
    const current = assessment(work);
    current.correctionReview = confirmCorrectionReview(work, current);
    const saved = JSON.parse(JSON.stringify(current)) as StudentAssessment;
    work.sections[0].tasks[0].description += " Weiteres Kriterium.";
    expect(getCorrectionCheck(work, saved).changedTaskIds).toEqual([work.sections[0].tasks[0].id]);
    expect(getCorrectionCheck(work, saved).complete).toBe(false);
    saved.correctionReview = confirmCorrectionReview(work, saved);
    work.gradeScale.bands[0].lowerBound += 1;
    expect(getCorrectionCheck(work, saved).changedTaskIds).toHaveLength(2);
  });

  it("öffnet die Durchsicht bei geänderten Punkten oder Kommentaren erneut", () => {
    const work = exam();
    const current = assessment(work);
    current.correctionReview = confirmCorrectionReview(work, current);
    expect(getCorrectionCheck(work, current).complete).toBe(true);
    expect(getCorrectionCheck(work, { ...current, teacherComment: "Ergänzt" }).complete).toBe(false);
    expect(getCorrectionCheck(work, { ...current, taskScores: { ...current.taskScores, [work.sections[0].tasks[0].id]: 1 } }).complete).toBe(false);
  });

  it("erkennt Teilnahme-Widersprüche und erlaubt einen bewussten Ausschluss ohne Datenverlust", () => {
    const work = exam();
    const current = { ...assessment(work), participationStatus: "excused" as const };
    expect(getCorrectionCheck(work, current)).toMatchObject({ participationConflict: true, missingTaskIds: [], complete: false });
    current.correctionReview = confirmCorrectionReview(work, current);
    expect(getCorrectionCheck(work, current).complete).toBe(true);
    expect(Object.keys(current.taskScores)).toHaveLength(2);
    expect(getCorrectionCheck(work, { ...current, participationStatus: "present" }).complete).toBe(false);
  });

  it("verweigert die Bestätigung bei ungültigen Punkten oder leerer Rubrik", () => {
    const work = exam();
    const current = assessment(work);
    const first = work.sections[0].tasks[0];
    for (const value of [-1, first.maxPoints + 1, Number.NaN]) {
      current.taskScores[first.id] = value;
      expect(getCorrectionCheck(work, current).invalidTaskIds).toEqual([first.id]);
      expect(confirmCorrectionReview(work, current)).toBeUndefined();
    }
    expect(getCorrectionCheck({ ...work, sections: [] }, current).canConfirm).toBe(false);
  });

  it("quittiert eine Rubrikänderung nicht allein durch Verlassen eines unveränderten Punktefelds", () => {
    const work = exam();
    const current = assessment(work);
    current.correctionReview = confirmCorrectionReview(work, current);
    const db: StudentDatabase = { version: 1, groups: [], assessments: { "work::student": current }, updatedAt: current.updatedAt };
    const task = work.sections[0].tasks[0];
    task.expectation += " geändert";
    const unchanged = updateStudentScore(db, "work", "student", task.id, 0, getTaskRubricSignatures(work)[task.id]);
    expect(unchanged).toBe(db);
    expect(getCorrectionCheck(work, unchanged.assessments["work::student"]).changedTaskIds).toContain(task.id);
    const changed = updateStudentScore(db, "work", "student", task.id, 1, getTaskRubricSignatures(work)[task.id]);
    expect(getCorrectionCheck(work, changed.assessments["work::student"]).changedTaskIds).not.toContain(task.id);
    expect(getCorrectionCheck(work, changed.assessments["work::student"]).complete).toBe(false);
  });
});
