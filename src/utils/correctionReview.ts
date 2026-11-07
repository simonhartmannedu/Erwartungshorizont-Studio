import type { CorrectionReview, Exam, StudentAssessment } from "../types";

/** Store the actual grading basis so comparisons do not depend on a hash. */
export const getTaskRubricSignatures = (exam: Exam): Record<string, string> => {
  const gradeContext = [exam.evaluationMode, exam.gradeScale.mode,
    exam.gradeScale.bands.map(({ label, lowerBound }) => [label, lowerBound]), exam.gradeScale.generator];
  return Object.fromEntries(exam.sections.flatMap((section) => section.tasks.map((task) => [
    task.id,
    JSON.stringify([gradeContext, section.title, section.description, section.note, section.maxPointsOverride,
      section.maxPointsOverride == null ? null : section.tasks.map(({ id, maxPoints }) => [id, maxPoints]),
      task.title, task.description, task.expectation, task.category, task.maxPoints]),
  ])));
};

const getConfirmationSignature = (exam: Exam, assessment: StudentAssessment) => JSON.stringify([
  getTaskRubricSignatures(exam),
  Object.entries(assessment.taskScores).sort(([a], [b]) => a.localeCompare(b)),
  assessment.participationStatus ?? "present",
  assessment.teacherComment,
]);

export const getCorrectionCheck = (exam: Exam, assessment: StudentAssessment) => {
  const tasks = exam.sections.flatMap((section) => section.tasks);
  const signatures = getTaskRubricSignatures(exam);
  const participates = (assessment.participationStatus ?? "present") === "present";
  const hasScore = (taskId: string) => Object.prototype.hasOwnProperty.call(assessment.taskScores, taskId);
  const missingTaskIds = participates ? tasks.filter((task) => !hasScore(task.id)).map((task) => task.id) : [];
  const invalidTaskIds = participates ? tasks.filter((task) => hasScore(task.id) &&
    (!Number.isFinite(assessment.taskScores[task.id]) || assessment.taskScores[task.id] < 0 || assessment.taskScores[task.id] > task.maxPoints))
    .map((task) => task.id) : [];
  const changedTaskIds = participates ? tasks.filter((task) => hasScore(task.id) &&
    assessment.correctionReview?.taskSignatures[task.id] !== undefined &&
    assessment.correctionReview.taskSignatures[task.id] !== signatures[task.id]).map((task) => task.id) : [];
  const unverifiedTaskIds = participates ? tasks.filter((task) => hasScore(task.id) &&
    assessment.correctionReview?.taskSignatures[task.id] === undefined).map((task) => task.id) : [];
  const confirmed = Boolean(assessment.correctionReview?.confirmedAt &&
    assessment.correctionReview.confirmedSignature === getConfirmationSignature(exam, assessment));
  const participationConflict = !participates && !confirmed &&
    (Object.keys(assessment.taskScores).length > 0 || Boolean(assessment.teacherComment.trim()));
  const canConfirm = (!participates || tasks.length > 0) && missingTaskIds.length === 0 && invalidTaskIds.length === 0;
  const complete = canConfirm && (participates ? confirmed : !participationConflict);
  return { missingTaskIds, invalidTaskIds, changedTaskIds, unverifiedTaskIds, participationConflict, canConfirm, complete, participates };
};

export const confirmCorrectionReview = (exam: Exam, assessment: StudentAssessment): CorrectionReview | undefined =>
  getCorrectionCheck(exam, assessment).canConfirm ? {
    taskSignatures: getTaskRubricSignatures(exam),
    confirmedAt: new Date().toISOString(),
    confirmedSignature: getConfirmationSignature(exam, assessment),
  } : assessment.correctionReview;

export const reviewAfterScoreChange = (review: CorrectionReview | undefined, taskId: string, signature?: string): CorrectionReview => ({
  taskSignatures: { ...review?.taskSignatures, ...(signature === undefined ? {} : { [taskId]: signature }) },
  confirmedAt: review?.confirmedAt ?? null,
  confirmedSignature: review?.confirmedSignature ?? null,
});
