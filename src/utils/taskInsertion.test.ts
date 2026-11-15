import { describe, expect, it } from "vitest";
import { sampleExam } from "../data/sampleExam";
import type { StudentAssessment } from "../types";
import { calculateExamSummary } from "./calculations";
import { confirmCorrectionReview, getCorrectionCheck } from "./correctionReview";
import { canUndoTaskInsertion, copyTaskForInsertion, getInsertionAssessmentState, insertTaskAtTarget, resolveInsertionPosition } from "./taskInsertion";

describe("Einfügen an einer ID-basierten Position", () => {
  it("ermittelt die Position nach einer Umsortierung neu und lehnt fehlende Teile und Anker ab", () => {
    const section = structuredClone(sampleExam.sections[0]);
    const anchor = section.tasks[1];
    const target = { sectionId: section.id, taskId: anchor.id, position: "after" as const };
    section.tasks.reverse();
    expect(resolveInsertionPosition([section], target)?.index).toBe(section.tasks.indexOf(anchor) + 1);
    expect(resolveInsertionPosition([], target)).toBeNull();
    expect(insertTaskAtTarget([{ ...section, tasks: [] }], target, anchor)).toBeNull();
    expect(resolveInsertionPosition([section], { ...target, position: "before" })?.index).toBe(section.tasks.indexOf(anchor));
    expect(resolveInsertionPosition([section], { ...target, taskId: null, position: "end" })?.index).toBe(section.tasks.length);
  });

  it("kopiert nur Rubrikfelder mit frischen IDs und verändert weder Quelle noch bestehende Bewertungen und Bogencheck", () => {
    const exam = structuredClone(sampleExam);
    const section = exam.sections[0];
    exam.answerSheetSettings = { blocks: [{ id: "block", type: "multipleChoice", title: "Bogen", taskId: section.tasks[0].id, optionLabels: ["A", "B"], correctAnswers: ["A"], answerPoints: [1] }] };
    const source = { ...section.tasks[0], achievedPoints: 4 };
    const original = structuredClone(exam);
    const task = copyTaskForInsertion(source, section.title);
    expect(task.id).not.toBe(source.id);
    expect(copyTaskForInsertion(source, section.title).id).not.toBe(task.id);
    expect(task).toMatchObject({ title: source.title, description: source.description, expectation: source.expectation, maxPoints: source.maxPoints, achievedPoints: 0 });
    const assessment: StudentAssessment = { workspaceId: "work", studentId: "fictional", taskScores: Object.fromEntries(exam.sections.flatMap((s) => s.tasks.map((t) => [t.id, 0]))), teacherComment: "", updatedAt: "", printedAt: null };
    assessment.correctionReview = confirmCorrectionReview(exam, assessment);
    expect(getCorrectionCheck(exam, assessment).complete).toBe(true);
    const sections = insertTaskAtTarget(exam.sections, { sectionId: section.id, taskId: section.tasks[1].id, position: "after" }, task)!;
    const next = { ...exam, sections };
    expect(sections[0].tasks[2]).toBe(task);
    expect(sections[0].tasks[3]).toBe(section.tasks[2]);
    expect(calculateExamSummary(next).totalMaxPoints).toBe(calculateExamSummary(exam).totalMaxPoints + task.maxPoints);
    expect(getCorrectionCheck(next, assessment).missingTaskIds).toEqual([task.id]);
    expect(getCorrectionCheck(next, assessment).complete).toBe(false);
    expect(assessment.taskScores).not.toHaveProperty(task.id);
    expect(next.answerSheetSettings).toEqual(original.answerSheetSettings);
    expect(exam).toEqual(original);
  });

  it("unterscheidet leere, erfasste Null- und verschlüsselte Bewertungen und schützt Rückgängig", () => {
    const assessment: StudentAssessment = { workspaceId: "work", studentId: "fictional", taskScores: {}, teacherComment: "", updatedAt: "", printedAt: null };
    expect(getInsertionAssessmentState([assessment])).toEqual({ hasScores: false, uncertain: false });
    expect(canUndoTaskInsertion("new", [assessment], [])).toBe(true);
    const scored = { ...assessment, taskScores: { new: 0 } };
    expect(getInsertionAssessmentState([scored]).hasScores).toBe(true);
    expect(canUndoTaskInsertion("new", [scored], [])).toBe(false);
    expect(canUndoTaskInsertion("new", [assessment], ["new"])).toBe(false);
    const locked = { ...assessment, encryptedTaskScores: { ciphertext: "opaque", iv: "iv", salt: "salt" } };
    expect(getInsertionAssessmentState([locked]).uncertain).toBe(true);
    expect(canUndoTaskInsertion("new", [locked], [])).toBe(false);
  });

  it("erhält feste Abschnittssummen und den Notenschlüssel bei einer eingefügten Unteraufgabe", () => {
    const exam = structuredClone(sampleExam);
    exam.sections[0].maxPointsOverride = 40;
    const source = exam.sections[0].tasks[0];
    const task = copyTaskForInsertion(source, source.category);
    const sections = insertTaskAtTarget(exam.sections, { sectionId: exam.sections[0].id, taskId: null, position: "end" }, task)!;
    const next = { ...exam, sections };
    expect(calculateExamSummary(next).totalMaxPoints).toBe(calculateExamSummary(exam).totalMaxPoints);
    expect(next.gradeScale).toEqual(exam.gradeScale);
    expect(next.sections[0].maxPointsOverride).toBe(40);
  });
});
