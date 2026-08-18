import * as v from "valibot";
import { DraftBundle, ExpectationArchiveEntry, StudentDatabase } from "../../types";

const encryptedTextSchema = v.object({
  ciphertext: v.string(),
  iv: v.string(),
  salt: v.string(),
});

const examSchema = v.object({
  id: v.string(),
  meta: v.object({
    schoolYear: v.string(),
    subject: v.string(),
    gradeLevel: v.string(),
    course: v.string(),
    teacher: v.string(),
    examDate: v.string(),
    title: v.string(),
    unit: v.string(),
    notes: v.string(),
  }),
  evaluationMode: v.union([v.literal("direct"), v.literal("weighted")]),
  gradeScale: v.object({
    id: v.string(),
    title: v.string(),
    mode: v.union([v.literal("percentage"), v.literal("points")]),
    schoolMode: v.union([v.literal("numeric"), v.literal("verbal"), v.literal("numericWithComment")]),
    bands: v.array(
      v.object({
        id: v.string(),
        label: v.string(),
        verbalLabel: v.string(),
        lowerBound: v.number(),
        color: v.string(),
      }),
    ),
    commentTemplate: v.string(),
    generator: v.object({
      source: v.union([v.literal("manual"), v.literal("notengenerator")]),
      thresholdPercent: v.number(),
      accumulationMode: v.union([v.literal("top"), v.literal("middle"), v.literal("bottom")]),
      useHalfPoints: v.boolean(),
      showTendency: v.boolean(),
      recommendedStage: v.nullable(v.union([v.literal("sek1"), v.literal("sek2")])),
    }),
  }),
  sections: v.array(
    v.object({
      id: v.string(),
      title: v.string(),
      description: v.string(),
      // Ältere EWHs enthielten frei gesetzte Abschnittsgewichtungen. Sie werden
      // beim Laden bewusst ignoriert, bleiben hier aber für bestehende Backups lesbar.
      weight: v.optional(v.number()),
      linkedSectionId: v.nullable(v.string()),
      maxPointsOverride: v.nullable(v.number()),
      note: v.string(),
      tasks: v.array(
        v.object({
          id: v.string(),
          title: v.string(),
          description: v.string(),
          category: v.string(),
          maxPoints: v.number(),
          achievedPoints: v.number(),
          expectation: v.string(),
        }),
      ),
    }),
  ),
  printSettings: v.object({
    showExpectations: v.boolean(),
    showTeacherComment: v.boolean(),
    compactRows: v.boolean(),
    showWeightedOverview: v.boolean(),
  }),
});

const workspaceSchema = v.object({
  id: v.string(),
  label: v.string(),
  exam: examSchema,
  activeArchiveEntryId: v.nullable(v.string()),
  assignedGroupId: v.nullable(v.string()),
  setupCompletedAt: v.optional(v.nullable(v.string())),
  updatedAt: v.string(),
  versions: v.array(
    v.object({
      id: v.string(),
      savedAt: v.string(),
      exam: examSchema,
    }),
  ),
});

const draftBundleSchema = v.object({
  activeWorkspaceId: v.string(),
  workspaces: v.array(workspaceSchema),
});

const archiveEntrySchema = v.object({
  id: v.string(),
  // These fields were derived in older archive entries and are restored from examSnapshot during loading.
  examId: v.optional(v.string()),
  examTitle: v.string(),
  schoolYear: v.string(),
  // Older archive entries did not persist this field; storage normalizes it from the exam snapshot.
  subject: v.optional(v.string()),
  gradeLevel: v.string(),
  course: v.optional(v.string()),
  teacher: v.optional(v.string()),
  examDate: v.string(),
  sectionCount: v.number(),
  totalMaxPoints: v.number(),
  expectationCount: v.number(),
  summaryText: v.string(),
  examSnapshot: examSchema,
  createdAt: v.string(),
});

const archiveEntriesSchema = v.array(archiveEntrySchema);

const studentDatabaseSchema = v.object({
  version: v.literal(1),
  groups: v.array(
    v.object({
      id: v.string(),
      subject: v.string(),
      className: v.string(),
      passwordVerifier: v.nullable(encryptedTextSchema),
      defaultSignatureDataUrl: v.optional(v.nullable(v.string())),
      students: v.array(
        v.object({
          id: v.string(),
          alias: v.string(),
          encryptedName: encryptedTextSchema,
          isAbsent: v.optional(v.boolean()),
          createdAt: v.string(),
        }),
      ),
      createdAt: v.string(),
      updatedAt: v.string(),
    }),
  ),
  assessments: v.record(
    v.string(),
    v.object({
      workspaceId: v.optional(v.nullable(v.string())),
      studentId: v.string(),
      taskScores: v.record(v.string(), v.number()),
      encryptedTaskScores: v.optional(v.nullable(encryptedTextSchema)),
      teacherComment: v.string(),
      signatureDataUrl: v.optional(v.nullable(v.string())),
      encryptedTeacherComment: v.optional(v.nullable(encryptedTextSchema)),
      encryptedSignatureDataUrl: v.optional(v.nullable(encryptedTextSchema)),
      participationStatus: v.optional(v.picklist(["present", "absent", "excused", "makeup"])),
      encryptedParticipationStatus: v.optional(v.nullable(encryptedTextSchema)),
      updatedAt: v.string(),
      printedAt: v.nullable(v.string()),
    }),
  ),
  updatedAt: v.string(),
});

const applicationDataSchema = v.object({
  draftBundle: draftBundleSchema,
  archiveEntries: archiveEntriesSchema,
  studentDatabase: studentDatabaseSchema,
});

export const isValidDraftBundleShape = (value: unknown): value is DraftBundle =>
  v.safeParse(draftBundleSchema, value).success;

export const isValidArchiveEntriesShape = (value: unknown): value is ExpectationArchiveEntry[] =>
  v.safeParse(archiveEntriesSchema, value).success;

export const isValidArchiveEntryShape = (value: unknown): value is ExpectationArchiveEntry =>
  v.safeParse(archiveEntrySchema, value).success;

export const isValidStudentDatabaseShape = (value: unknown): value is StudentDatabase =>
  v.safeParse(studentDatabaseSchema, value).success;

export const isValidApplicationDataShape = (value: unknown): value is {
  draftBundle: DraftBundle;
  archiveEntries: ExpectationArchiveEntry[];
  studentDatabase: StudentDatabase;
} => v.safeParse(applicationDataSchema, value).success;
