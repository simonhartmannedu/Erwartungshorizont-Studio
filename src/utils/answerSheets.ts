import { AnswerSheetBlock, Exam } from "../types";
import { generateSecurityToken } from "./securityTokens";

export const ANSWER_SHEET_QR_PREFIX = "EWH-BOGENCHECK:";

export const createAnswerSheetCode = () => generateSecurityToken(3, 4);

export const encodeAnswerSheetQrValue = (workCode: string) => `${ANSWER_SHEET_QR_PREFIX}${workCode}`;

export const decodeAnswerSheetQrValue = (value: string) => {
  const trimmed = value.trim();
  return trimmed.startsWith(ANSWER_SHEET_QR_PREFIX)
    ? trimmed.slice(ANSWER_SHEET_QR_PREFIX.length).trim()
    : null;
};

export const getAnswerSheetBlocks = (exam: Exam) => exam.answerSheetSettings?.blocks ?? [];

export const getMultipleChoiceBlocks = (exam: Exam) =>
  getAnswerSheetBlocks(exam).filter((block): block is Extract<AnswerSheetBlock, { type: "multipleChoice" }> => block.type === "multipleChoice");

export type SelectableAnswerBlock = Extract<AnswerSheetBlock, { type: "multipleChoice" | "matching" | "trueFalse" | "multipleResponse" | "ordering" }>;

export const getMatchingBlocks = (exam: Exam) =>
  getAnswerSheetBlocks(exam).filter((block): block is Extract<AnswerSheetBlock, { type: "matching" }> => block.type === "matching");

export const getSelectableAnswerBlocks = (exam: Exam): SelectableAnswerBlock[] =>
  getAnswerSheetBlocks(exam).filter((block): block is SelectableAnswerBlock =>
    block.type === "multipleChoice" || block.type === "matching" || block.type === "trueFalse" || block.type === "multipleResponse" || block.type === "ordering",
  );

export const calculateSelectableAnswerPoints = (
  block: SelectableAnswerBlock,
  markedAnswers: string[][],
) => block.correctAnswers.reduce((total, expected, index) => {
  const marked = markedAnswers[index] ?? [];
  const correct = Array.isArray(expected) ? expected : [expected];
  const isCorrect = marked.length === correct.length && marked.every((choice) => correct.includes(choice));
  return total + (isCorrect ? (block.answerPoints[index] ?? block.pointsPerAnswer ?? 0) : 0);
}, 0);

export const getSelectableAnswerMaximum = (block: SelectableAnswerBlock) =>
  block.correctAnswers.reduce((total, _, index) => total + (block.answerPoints[index] ?? block.pointsPerAnswer ?? 0), 0);

export const getTaskPointMaximum = (exam: Exam, taskId: string) =>
  exam.sections.flatMap((section) => section.tasks).find((task) => task.id === taskId)?.maxPoints ?? 0;
