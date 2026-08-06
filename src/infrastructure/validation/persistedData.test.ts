import { describe, expect, it } from "vitest";
import { sampleExam } from "../../data/sampleExam";
import {
  isValidApplicationDataShape,
  isValidArchiveEntriesShape,
  isValidDraftBundleShape,
  isValidStudentDatabaseShape,
} from "./persistedData";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const validStudentDatabase = {
  version: 1,
  groups: [
    {
      id: "group-1",
      subject: "Testfach",
      className: "T1",
      passwordVerifier: null,
      students: [
        {
          id: "student-1",
          alias: "TEST-01",
          encryptedName: { ciphertext: "AA==", iv: "AA==", salt: "AA==" },
          createdAt: "2026-08-06T12:00:00.000Z",
        },
      ],
      createdAt: "2026-08-06T12:00:00.000Z",
      updatedAt: "2026-08-06T12:00:00.000Z",
    },
  ],
  assessments: {
    "student-1": {
      workspaceId: null,
      studentId: "student-1",
      taskScores: { "task-1": 4 },
      teacherComment: "",
      updatedAt: "2026-08-06T12:00:00.000Z",
      printedAt: null,
    },
  },
  updatedAt: "2026-08-06T12:00:00.000Z",
};

describe("persistierte Domain-Schemas", () => {
  it("akzeptiert vollständige Workspaces und lehnt falsche Punktewerte ab", () => {
    const draftBundle = {
      activeWorkspaceId: "workspace-1",
      workspaces: [
        {
          id: "workspace-1",
          label: "Testarbeit",
          exam: sampleExam,
          activeArchiveEntryId: null,
          assignedGroupId: null,
          updatedAt: "2026-08-06T12:00:00.000Z",
          versions: [],
        },
      ],
    };
    const invalidDraftBundle = clone(draftBundle);
    invalidDraftBundle.workspaces[0].exam.sections[0].tasks[0].maxPoints = "vier" as never;

    expect(isValidDraftBundleShape(draftBundle)).toBe(true);
    expect(isValidDraftBundleShape(invalidDraftBundle)).toBe(false);
  });

  it("akzeptiert archivierte Legacy-Metadaten, wenn der Snapshot vollständig ist", () => {
    const entries = [
      {
        id: "archive-1",
        examTitle: "Archiv",
        schoolYear: "2026/27",
        gradeLevel: "8",
        examDate: "2026-08-01",
        sectionCount: sampleExam.sections.length,
        totalMaxPoints: 10,
        expectationCount: 1,
        summaryText: "Test",
        examSnapshot: sampleExam,
        createdAt: "2026-08-06T12:00:00.000Z",
      },
    ];

    expect(isValidArchiveEntriesShape(entries)).toBe(true);
  });

  it("validiert verschachtelte Schülerdaten vor der Übernahme", () => {
    const invalidDatabase = clone(validStudentDatabase);
    invalidDatabase.assessments["student-1"].taskScores["task-1"] = "vier" as never;

    expect(isValidStudentDatabaseShape(validStudentDatabase)).toBe(true);
    expect(isValidStudentDatabaseShape(invalidDatabase)).toBe(false);
  });

  it("akzeptiert einen vollständigen, koordinierten Anwendungszustand", () => {
    const applicationData = {
      draftBundle: {
        activeWorkspaceId: "workspace-1",
        workspaces: [
          {
            id: "workspace-1",
            label: "Testarbeit",
            exam: sampleExam,
            activeArchiveEntryId: null,
            assignedGroupId: null,
            updatedAt: "2026-08-06T12:00:00.000Z",
            versions: [],
          },
        ],
      },
      archiveEntries: [],
      studentDatabase: validStudentDatabase,
    };

    expect(isValidApplicationDataShape(applicationData)).toBe(true);
  });
});
