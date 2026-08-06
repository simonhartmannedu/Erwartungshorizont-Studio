import { describe, expect, it } from "vitest";
import type { DraftBundle, Exam } from "../../types";
import { appendWorkspaceVersion, createWorkspaceVersion, restoreWorkspaceVersionInBundle } from "./versions";

const createExam = (id: string): Exam => ({
  id,
  meta: {
    schoolYear: "2026/27",
    subject: "Mathematik",
    gradeLevel: "8",
    course: "",
    teacher: "Test",
    examDate: "2026-08-06",
    title: "Fiktive Arbeit",
    unit: "",
    notes: "",
  },
  evaluationMode: "direct",
  gradeScale: {
    id: "scale",
    title: "Skala",
    mode: "percentage",
    schoolMode: "numeric",
    commentTemplate: "",
    generator: {
      source: "manual",
      thresholdPercent: 50,
      accumulationMode: "middle",
      useHalfPoints: false,
      showTendency: false,
      recommendedStage: null,
    },
    bands: [],
  },
  sections: [],
  printSettings: {
    showExpectations: true,
    showTeacherComment: true,
    compactRows: false,
    showWeightedOverview: false,
  },
});

const cloneExam = (exam: Exam) => JSON.parse(JSON.stringify(exam)) as Exam;

const bundle: DraftBundle = {
  activeWorkspaceId: "workspace-1",
  workspaces: [
    {
      id: "workspace-1",
      label: "Fiktive Klassenarbeit",
      exam: createExam("current"),
      activeArchiveEntryId: null,
      assignedGroupId: null,
      updatedAt: "2026-08-06T08:00:00.000Z",
      versions: [
        {
          id: "version-old",
          savedAt: "2026-08-05T08:00:00.000Z",
          exam: createExam("old"),
        },
      ],
    },
  ],
};

describe("Workspace-Versionen", () => {
  it("adds a cloned snapshot without mutating the workspace bundle", () => {
    const snapshot = createWorkspaceVersion(bundle.workspaces[0]!.exam, "version-new", "2026-08-06T09:00:00.000Z", cloneExam);
    const next = appendWorkspaceVersion(bundle, "workspace-1", snapshot, 10);

    expect(next.workspaces[0]!.versions.map((version) => version.id)).toEqual(["version-new", "version-old"]);
    expect(next.workspaces[0]!.versions[0]!.exam).not.toBe(bundle.workspaces[0]!.exam);
    expect(bundle.workspaces[0]!.versions.map((version) => version.id)).toEqual(["version-old"]);
  });

  it("restores a snapshot while preserving the current exam as a new local version", () => {
    const timestamps = ["2026-08-06T10:00:00.000Z", "2026-08-06T10:00:01.000Z"];
    const next = restoreWorkspaceVersionInBundle(
      bundle,
      { workspaceId: "workspace-1", version: bundle.workspaces[0]!.versions[0]! },
      {
        maxVersions: 10,
        createVersionId: () => "version-current",
        createTimestamp: () => timestamps.shift()!,
        cloneExam,
        normalizeExam: (exam) => ({ ...exam, meta: { ...exam.meta, title: `${exam.meta.title} normalisiert` } }),
      },
    );

    expect(next.workspaces[0]!.exam.id).toBe("old");
    expect(next.workspaces[0]!.exam.meta.title).toBe("Fiktive Arbeit normalisiert");
    expect(next.workspaces[0]!.updatedAt).toBe("2026-08-06T10:00:01.000Z");
    expect(next.workspaces[0]!.versions.map((version) => version.id)).toEqual(["version-current"]);
    expect(next.workspaces[0]!.versions[0]!.exam.id).toBe("current");
    expect(bundle.workspaces[0]!.exam.id).toBe("current");
  });
});
