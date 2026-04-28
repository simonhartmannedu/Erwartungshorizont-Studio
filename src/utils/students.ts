import { Exam, SelectedStudentContext, StudentAssessment, StudentDatabase, StudentGroup, StudentRecord } from "../types";
import { clamp } from "./format";
import { decryptText, encryptText } from "./crypto";

const POINT_STEP = 0.5;

const snapToPointStep = (value: number) => Math.round(value / POINT_STEP) * POINT_STEP;

const getAssessmentKey = (workspaceId: string | null, studentId: string) =>
  workspaceId ? `${workspaceId}::${studentId}` : studentId;

const getStoredStudentAssessment = (database: StudentDatabase, studentId: string, workspaceId: string | null = null) => {
  if (workspaceId) {
    const scopedAssessment = database.assessments[getAssessmentKey(workspaceId, studentId)];
    if (scopedAssessment) {
      return {
        ...scopedAssessment,
        workspaceId: scopedAssessment.workspaceId ?? workspaceId,
      };
    }
  }

  const legacyAssessment = database.assessments[studentId];
  if (legacyAssessment) {
    return {
      ...legacyAssessment,
      workspaceId: legacyAssessment.workspaceId ?? null,
    };
  }

  return null;
};

const emptyAssessment = (studentId: string, workspaceId: string | null = null): StudentAssessment => ({
  workspaceId,
  studentId,
  taskScores: {},
  encryptedTaskScores: null,
  teacherComment: "",
  signatureDataUrl: null,
  encryptedTeacherComment: null,
  encryptedSignatureDataUrl: null,
  updatedAt: new Date().toISOString(),
  printedAt: null,
});

export const getStudentAssessment = (database: StudentDatabase, studentId: string, workspaceId: string | null = null) =>
  getStoredStudentAssessment(database, studentId, workspaceId) ?? emptyAssessment(studentId, workspaceId);

export const getStudentCorrectionStatus = (
  exam: Exam,
  assessment: StudentAssessment,
): "uncorrected" | "inProgress" | "corrected" => {
  const taskIds = exam.sections.flatMap((section) => section.tasks.map((task) => task.id));
  if (taskIds.length === 0) return "uncorrected";

  const scoredTaskCount = taskIds.reduce(
    (count, taskId) => count + (Object.prototype.hasOwnProperty.call(assessment.taskScores, taskId) ? 1 : 0),
    0,
  );

  if (scoredTaskCount === 0) return "uncorrected";
  if (scoredTaskCount === taskIds.length) return "corrected";
  return "inProgress";
};

export const buildExamForStudent = (
  exam: Exam,
  database: StudentDatabase,
  selectedStudent: SelectedStudentContext | null,
  workspaceId: string | null = null,
) => {
  if (!selectedStudent) return exam;

  const assessment = getStudentAssessment(database, selectedStudent.studentId, workspaceId);

  return {
    ...exam,
    sections: exam.sections.map((section) => ({
      ...section,
      tasks: section.tasks.map((task) => ({
        ...task,
        achievedPoints: assessment.taskScores[task.id] ?? 0,
      })),
    })),
  };
};

export const updateStudentScore = (
  database: StudentDatabase,
  workspaceId: string | null,
  studentId: string,
  taskId: string,
  score: number,
): StudentDatabase => {
  const assessment = getStudentAssessment(database, studentId, workspaceId);
  const assessmentKey = getAssessmentKey(workspaceId, studentId);

  return {
    ...database,
    assessments: {
      ...database.assessments,
      [assessmentKey]: {
        ...assessment,
        workspaceId,
        taskScores: {
          ...assessment.taskScores,
          [taskId]: score,
        },
        encryptedTaskScores: assessment.encryptedTaskScores ?? null,
        updatedAt: new Date().toISOString(),
      },
    },
    updatedAt: new Date().toISOString(),
  };
};

export const scaleTaskScoresForStudents = (
  database: StudentDatabase,
  studentIds: string[],
  workspaceId: string | null,
  taskId: string,
  previousMaxPoints: number,
  nextMaxPoints: number,
): StudentDatabase => {
  if (!Number.isFinite(previousMaxPoints) || previousMaxPoints <= 0) return database;
  if (!Number.isFinite(nextMaxPoints) || nextMaxPoints < 0) return database;
  if (Math.abs(previousMaxPoints - nextMaxPoints) < 0.0001) return database;

  let didChange = false;
  const assessments = { ...database.assessments };

  studentIds.forEach((studentId) => {
    const assessment = getStoredStudentAssessment(database, studentId, workspaceId);
    if (!assessment || !Object.prototype.hasOwnProperty.call(assessment.taskScores, taskId)) return;

    const currentScore = assessment.taskScores[taskId];
    const scaledScore = clamp(snapToPointStep((currentScore / previousMaxPoints) * nextMaxPoints), 0, nextMaxPoints);

    if (Math.abs(currentScore - scaledScore) < 0.0001) return;

    didChange = true;
    assessments[getAssessmentKey(workspaceId, studentId)] = {
      ...assessment,
      workspaceId,
      taskScores: {
        ...assessment.taskScores,
        [taskId]: scaledScore,
      },
      encryptedTaskScores: assessment.encryptedTaskScores ?? null,
      updatedAt: new Date().toISOString(),
    };
  });

  if (!didChange) return database;

  return {
    ...database,
    assessments,
    updatedAt: new Date().toISOString(),
  };
};

export const updateTeacherComment = (
  database: StudentDatabase,
  workspaceId: string | null,
  studentId: string,
  teacherComment: string,
): StudentDatabase => {
  const assessment = getStudentAssessment(database, studentId, workspaceId);
  const assessmentKey = getAssessmentKey(workspaceId, studentId);

  return {
    ...database,
    assessments: {
      ...database.assessments,
      [assessmentKey]: {
        ...assessment,
        workspaceId,
        teacherComment,
        encryptedTaskScores: assessment.encryptedTaskScores ?? null,
        encryptedTeacherComment: assessment.encryptedTeacherComment ?? null,
        encryptedSignatureDataUrl: assessment.encryptedSignatureDataUrl ?? null,
        updatedAt: new Date().toISOString(),
      },
    },
    updatedAt: new Date().toISOString(),
  };
};

export const updateStudentSignature = (
  database: StudentDatabase,
  workspaceId: string | null,
  studentId: string,
  signatureDataUrl: string | null,
): StudentDatabase => {
  const assessment = getStudentAssessment(database, studentId, workspaceId);
  const assessmentKey = getAssessmentKey(workspaceId, studentId);

  return {
    ...database,
    assessments: {
      ...database.assessments,
      [assessmentKey]: {
        ...assessment,
        workspaceId,
        signatureDataUrl,
        encryptedTaskScores: assessment.encryptedTaskScores ?? null,
        encryptedTeacherComment: assessment.encryptedTeacherComment ?? null,
        encryptedSignatureDataUrl: assessment.encryptedSignatureDataUrl ?? null,
        updatedAt: new Date().toISOString(),
      },
    },
    updatedAt: new Date().toISOString(),
  };
};

export const markStudentPrinted = (
  database: StudentDatabase,
  workspaceId: string | null,
  studentId: string,
): StudentDatabase => {
  const assessment = getStudentAssessment(database, studentId, workspaceId);
  const assessmentKey = getAssessmentKey(workspaceId, studentId);

  return {
    ...database,
    assessments: {
      ...database.assessments,
      [assessmentKey]: {
        ...assessment,
        workspaceId,
        printedAt: new Date().toISOString(),
      },
    },
    updatedAt: new Date().toISOString(),
  };
};

export const createStudentGroup = (subject: string, className: string): StudentGroup => ({
  id: crypto.randomUUID(),
  subject,
  className,
  passwordVerifier: null,
  defaultSignatureDataUrl: null,
  students: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const addStudentGroup = (database: StudentDatabase, group: StudentGroup): StudentDatabase => ({
  ...database,
  groups: [...database.groups, group],
  updatedAt: new Date().toISOString(),
});

export const upsertStudentGroup = (database: StudentDatabase, group: StudentGroup): StudentDatabase => ({
  ...database,
  groups: database.groups.some((entry) => entry.id === group.id)
    ? database.groups.map((entry) => (entry.id === group.id ? { ...group, updatedAt: new Date().toISOString() } : entry))
    : [...database.groups, { ...group, updatedAt: new Date().toISOString() }],
  updatedAt: new Date().toISOString(),
});

export const addStudentToGroup = (
  database: StudentDatabase,
  groupId: string,
  student: StudentRecord,
): StudentDatabase => ({
  ...database,
  groups: database.groups.map((group) =>
    group.id === groupId
      ? {
          ...group,
          students: [...group.students, student],
          updatedAt: new Date().toISOString(),
        }
      : group,
  ),
  updatedAt: new Date().toISOString(),
});

export const setStudentOrderInGroup = (
  database: StudentDatabase,
  groupId: string,
  orderedStudentIds: string[],
): StudentDatabase => {
  const group = database.groups.find((entry) => entry.id === groupId);
  if (!group) return database;

  const studentById = new Map(group.students.map((student) => [student.id, student]));
  const reorderedStudents = orderedStudentIds
    .map((studentId) => studentById.get(studentId) ?? null)
    .filter((student): student is StudentRecord => student !== null);

  group.students.forEach((student) => {
    if (!orderedStudentIds.includes(student.id)) {
      reorderedStudents.push(student);
    }
  });

  if (
    reorderedStudents.length === group.students.length &&
    reorderedStudents.every((student, index) => student.id === group.students[index]?.id)
  ) {
    return database;
  }

  return {
    ...database,
    groups: database.groups.map((entry) =>
      entry.id !== groupId
        ? entry
        : {
            ...entry,
            students: reorderedStudents,
            updatedAt: new Date().toISOString(),
          },
    ),
    updatedAt: new Date().toISOString(),
  };
};

export const updateStudentAbsentStatus = (
  database: StudentDatabase,
  groupId: string,
  studentId: string,
  isAbsent: boolean,
): StudentDatabase => ({
  ...database,
  groups: database.groups.map((group) =>
    group.id !== groupId
      ? group
      : {
          ...group,
          students: group.students.map((student) =>
            student.id !== studentId ? student : { ...student, isAbsent }
          ),
          updatedAt: new Date().toISOString(),
        },
  ),
  updatedAt: new Date().toISOString(),
});

export const removeStudentFromGroup = (
  database: StudentDatabase,
  groupId: string,
  studentId: string,
): StudentDatabase => {
  const nextAssessments = Object.fromEntries(
    Object.entries(database.assessments).filter(([, assessment]) => assessment.studentId !== studentId),
  );

  return {
    ...database,
    groups: database.groups.map((group) =>
      group.id === groupId
        ? {
            ...group,
            students: group.students.filter((student) => student.id !== studentId),
            updatedAt: new Date().toISOString(),
          }
        : group,
    ),
    assessments: nextAssessments,
    updatedAt: new Date().toISOString(),
  };
};

export const removeStudentGroup = (
  database: StudentDatabase,
  groupId: string,
): StudentDatabase => {
  const group = database.groups.find((entry) => entry.id === groupId);
  if (!group) return database;

  const removedStudentIds = new Set(group.students.map((student) => student.id));
  const nextAssessments = Object.fromEntries(
    Object.entries(database.assessments).filter(([, assessment]) => !removedStudentIds.has(assessment.studentId)),
  );

  return {
    ...database,
    groups: database.groups.filter((entry) => entry.id !== groupId),
    assessments: nextAssessments,
    updatedAt: new Date().toISOString(),
  };
};

export const getStudentGroup = (database: StudentDatabase, groupId: string | null) =>
  database.groups.find((group) => group.id === groupId) ?? null;

export const updateGroupPasswordVerifier = (
  database: StudentDatabase,
  groupId: string,
  passwordVerifier: StudentGroup["passwordVerifier"],
): StudentDatabase => ({
  ...database,
  groups: database.groups.map((group) =>
    group.id === groupId
      ? {
          ...group,
          passwordVerifier,
          updatedAt: new Date().toISOString(),
        }
      : group,
  ),
  updatedAt: new Date().toISOString(),
});

export const updateGroupDefaultSignature = (
  database: StudentDatabase,
  groupId: string,
  defaultSignatureDataUrl: string | null,
): StudentDatabase => ({
  ...database,
  groups: database.groups.map((group) =>
    group.id === groupId
      ? {
          ...group,
          defaultSignatureDataUrl,
          updatedAt: new Date().toISOString(),
        }
      : group,
  ),
  updatedAt: new Date().toISOString(),
});

export const getEffectiveSignatureDataUrl = (
  group: StudentGroup | null,
  assessment: StudentAssessment | null,
) => assessment?.signatureDataUrl ?? group?.defaultSignatureDataUrl ?? null;

export const getStudentRecord = (database: StudentDatabase, studentId: string | null) => {
  if (!studentId) return null;
  for (const group of database.groups) {
    const student = group.students.find((entry) => entry.id === studentId);
    if (student) return student;
  }
  return null;
};

const getStudentGroupIdByStudentId = (database: StudentDatabase, studentId: string) =>
  database.groups.find((group) => group.students.some((student) => student.id === studentId))?.id ?? null;

export const scrubSensitiveAssessmentsForGroups = (database: StudentDatabase, groupIds: string[]): StudentDatabase => {
  if (groupIds.length === 0) return database;
  const targetIds = new Set(groupIds);
  let didChange = false;

  const nextAssessments = Object.fromEntries(
    Object.entries(database.assessments).map(([assessmentKey, assessment]) => {
      const groupId = getStudentGroupIdByStudentId(database, assessment.studentId);
      if (!groupId || !targetIds.has(groupId)) return [assessmentKey, assessment];
      if (!assessment.teacherComment && !assessment.signatureDataUrl) return [assessmentKey, assessment];

      didChange = true;
      return [
        assessmentKey,
        {
          ...assessment,
          teacherComment: "",
          taskScores: {},
          signatureDataUrl: null,
        },
      ];
    }),
  );

  return didChange ? { ...database, assessments: nextAssessments } : database;
};

export const hydrateSensitiveAssessmentsForGroup = async (
  database: StudentDatabase,
  groupId: string,
  password: string,
): Promise<StudentDatabase> => {
  const group = getStudentGroup(database, groupId);
  if (!group?.passwordVerifier) return database;

  const targetStudentIds = new Set(group.students.map((student) => student.id));
  let didChange = false;

  const nextEntries = await Promise.all(
    Object.entries(database.assessments).map(async ([assessmentKey, assessment]) => {
      if (!targetStudentIds.has(assessment.studentId)) return [assessmentKey, assessment] as const;

      let teacherComment = assessment.teacherComment;
      let signatureDataUrl = assessment.signatureDataUrl ?? null;
      let taskScores = assessment.taskScores;

      if (Object.keys(taskScores).length === 0 && assessment.encryptedTaskScores) {
        const parsedTaskScores = JSON.parse(await decryptText(assessment.encryptedTaskScores, password)) as Record<string, number>;
        taskScores = parsedTaskScores;
        didChange = true;
      }

      if (!teacherComment && assessment.encryptedTeacherComment) {
        teacherComment = await decryptText(assessment.encryptedTeacherComment, password);
        didChange = true;
      }

      if (!signatureDataUrl && assessment.encryptedSignatureDataUrl) {
        signatureDataUrl = await decryptText(assessment.encryptedSignatureDataUrl, password);
        didChange = true;
      }

      return [
        assessmentKey,
        {
          ...assessment,
          taskScores,
          teacherComment,
          signatureDataUrl,
        },
      ] as const;
    }),
  );

  return didChange
    ? { ...database, assessments: Object.fromEntries(nextEntries), updatedAt: database.updatedAt }
    : database;
};

export const serializeStudentDatabaseForStorage = async (
  database: StudentDatabase,
  getUnlockedPassword: (groupId: string) => string | null,
): Promise<StudentDatabase> => {
  const studentToGroupId = new Map<string, string>();
  database.groups.forEach((group) => {
    group.students.forEach((student) => {
      studentToGroupId.set(student.id, group.id);
    });
  });

  const nextEntries = await Promise.all(
    Object.entries(database.assessments).map(async ([assessmentKey, assessment]) => {
      const groupId = studentToGroupId.get(assessment.studentId) ?? null;
      const group = groupId ? getStudentGroup(database, groupId) : null;

      if (!group?.passwordVerifier) {
        return [assessmentKey, assessment] as const;
      }

      const unlockedPassword = getUnlockedPassword(group.id);
      if (!unlockedPassword) {
        if (!assessment.encryptedTaskScores && !assessment.encryptedTeacherComment && !assessment.encryptedSignatureDataUrl) {
          return [assessmentKey, assessment] as const;
        }

        return [
          assessmentKey,
          {
            ...assessment,
            taskScores: {},
            teacherComment: "",
            signatureDataUrl: null,
          },
        ] as const;
      }

      const encryptedTaskScores = Object.keys(assessment.taskScores).length > 0
        ? await encryptText(JSON.stringify(assessment.taskScores), unlockedPassword)
        : null;
      const encryptedTeacherComment = assessment.teacherComment
        ? await encryptText(assessment.teacherComment, unlockedPassword)
        : null;
      const encryptedSignatureDataUrl = assessment.signatureDataUrl
        ? await encryptText(assessment.signatureDataUrl, unlockedPassword)
        : null;

      return [
        assessmentKey,
        {
          ...assessment,
          taskScores: {},
          encryptedTaskScores,
          teacherComment: "",
          signatureDataUrl: null,
          encryptedTeacherComment,
          encryptedSignatureDataUrl,
        },
      ] as const;
    }),
  );

  return {
    ...database,
    assessments: Object.fromEntries(nextEntries),
  };
};
