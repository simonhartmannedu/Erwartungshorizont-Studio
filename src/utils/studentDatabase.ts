import { EncryptedText, StudentAssessment, StudentDatabase, StudentGroup, StudentRecord } from "../types";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isIsoTimestamp = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

const isFiniteNumberRecord = (value: unknown): value is Record<string, number> =>
  isPlainObject(value) && Object.values(value).every((entry) => typeof entry === "number" && Number.isFinite(entry));

export const createEmptyStudentDatabase = (): StudentDatabase => ({
  version: 1,
  groups: [],
  assessments: {},
  updatedAt: new Date().toISOString(),
});

export const isEncryptedText = (value: unknown): value is EncryptedText =>
  isPlainObject(value) &&
  typeof value.ciphertext === "string" &&
  typeof value.iv === "string" &&
  typeof value.salt === "string";

export const isStudentRecord = (value: unknown): value is StudentRecord =>
  isPlainObject(value) &&
  typeof value.id === "string" &&
  typeof value.alias === "string" &&
  isEncryptedText(value.encryptedName) &&
  (value.isAbsent === undefined || typeof value.isAbsent === "boolean") &&
  isIsoTimestamp(value.createdAt);

export const isStudentGroup = (value: unknown): value is StudentGroup =>
  isPlainObject(value) &&
  typeof value.id === "string" &&
  typeof value.subject === "string" &&
  typeof value.className === "string" &&
  (value.passwordVerifier === null || isEncryptedText(value.passwordVerifier)) &&
  (value.defaultSignatureDataUrl == null || typeof value.defaultSignatureDataUrl === "string") &&
  Array.isArray(value.students) &&
  value.students.every(isStudentRecord) &&
  isIsoTimestamp(value.createdAt) &&
  isIsoTimestamp(value.updatedAt);

export const isStudentAssessment = (value: unknown): value is StudentAssessment =>
  isPlainObject(value) &&
  (value.workspaceId === null || value.workspaceId === undefined || typeof value.workspaceId === "string") &&
  typeof value.studentId === "string" &&
  isFiniteNumberRecord(value.taskScores) &&
  typeof value.teacherComment === "string" &&
  (value.signatureDataUrl == null || typeof value.signatureDataUrl === "string") &&
  isIsoTimestamp(value.updatedAt) &&
  (value.printedAt === null || isIsoTimestamp(value.printedAt));

export const isStudentDatabase = (value: unknown): value is StudentDatabase => {
  if (!isPlainObject(value)) return false;
  if (value.version !== 1) return false;
  if (!Array.isArray(value.groups) || !value.groups.every(isStudentGroup)) return false;
  if (!isPlainObject(value.assessments) || !Object.values(value.assessments).every(isStudentAssessment)) return false;
  if (!isIsoTimestamp(value.updatedAt)) return false;

  const studentIds = new Set<string>();

  for (const group of value.groups) {
    if (group.students.some((student) => studentIds.has(student.id))) {
      return false;
    }

    group.students.forEach((student) => {
      studentIds.add(student.id);
    });
  }

  return Object.entries(value.assessments).every(([assessmentKey, assessment]) => {
    if (!isStudentAssessment(assessment)) return false;
    const workspaceId = assessment.workspaceId ?? null;
    const expectedScopedKey = workspaceId ? `${workspaceId}::${assessment.studentId}` : assessment.studentId;
    return (
      studentIds.has(assessment.studentId) &&
      (assessmentKey === assessment.studentId || assessmentKey === expectedScopedKey)
    );
  });
};
