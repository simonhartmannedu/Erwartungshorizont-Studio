import { describe, expect, it } from "vitest";
import { Exam } from "../types";
import { parseArchiveEntries, parseDraftBundle, parseStudentDatabaseState } from "./storage";

const legacyExam: Exam = {
  id: "legacy-exam",
  meta: {
    schoolYear: "2025/26",
    subject: "Englisch",
    gradeLevel: "8",
    course: "",
    teacher: "Test",
    examDate: "2026-01-01",
    title: "Alte Klassenarbeit",
    unit: "",
    notes: "",
  },
  evaluationMode: "direct",
  gradeScale: {
    id: "legacy-scale",
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
    bands: [{ id: "legacy-band", label: "1", verbalLabel: "sehr gut", lowerBound: 0, color: "#000000" }],
  },
  sections: [],
  printSettings: {
    showExpectations: true,
    showTeacherComment: true,
    compactRows: false,
    showWeightedOverview: false,
  },
};

describe("Storage-Normalisierung", () => {
  it("hebt ein Legacy-Exam ohne Datenverlust in ein Workspace-Bundle", () => {
    const bundle = parseDraftBundle(JSON.stringify(legacyExam));

    expect(bundle).not.toBeNull();
    expect(bundle?.activeWorkspaceId).toBe("migrated-workspace");
    expect(bundle?.workspaces[0]).toMatchObject({
      label: "Klassenarbeit 1",
      assignedGroupId: null,
      versions: [],
      exam: { id: "legacy-exam", meta: { title: "Alte Klassenarbeit" } },
    });
  });

  it("liest einen versionierten v2-Umschlag", () => {
    const bundle = parseDraftBundle(
      JSON.stringify({ schemaVersion: 2, updatedAt: "2026-08-06T12:00:00.000Z", payload: legacyExam }),
    );

    expect(bundle?.workspaces[0]?.exam.meta.title).toBe("Alte Klassenarbeit");
  });

  it("behält den gespeicherten EWH-Einrichtungsstatus unabhängig vom Titel", () => {
    const setupCompletedAt = "2026-08-13T09:00:00.000Z";
    const bundle = parseDraftBundle(
      JSON.stringify({
        activeWorkspaceId: "workspace-1",
        workspaces: [
          {
            id: "workspace-1",
            label: "Klassenarbeit 1",
            exam: { ...legacyExam, meta: { ...legacyExam.meta, title: "" } },
            activeArchiveEntryId: null,
            assignedGroupId: null,
            setupCompletedAt,
            updatedAt: setupCompletedAt,
            versions: [],
          },
        ],
      }),
    );

    expect(bundle?.workspaces[0]?.setupCompletedAt).toBe(setupCompletedAt);
  });

  it("normalisiert ein älteres Archiv vor der strengen Laufzeitvalidierung", () => {
    const legacyArchive = [
      {
        id: "legacy-archive-entry",
        examTitle: "Alte Klassenarbeit",
        schoolYear: "2025/26",
        gradeLevel: "8",
        examDate: "2026-01-01",
        sectionCount: 0,
        totalMaxPoints: 0,
        expectationCount: 0,
        summaryText: "",
        createdAt: "2026-01-01T10:00:00.000Z",
        examSnapshot: {
          ...legacyExam,
          gradeScale: {
            ...legacyExam.gradeScale,
            generator: undefined,
          },
          printSettings: undefined,
        },
      },
    ];

    const entries = parseArchiveEntries(JSON.stringify(legacyArchive));

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      examId: "legacy-exam",
      subject: "Englisch",
      course: "",
      teacher: "Test",
      examSnapshot: {
        gradeScale: { generator: { source: "manual" } },
        printSettings: { showWeightedOverview: false },
      },
    });
  });

  it("stoppt bei einer ungültigen Schülerdatenbank statt sie zu überschreiben", () => {
    expect(() =>
      parseStudentDatabaseState(
        JSON.stringify({ version: 1, groups: [{ id: "unvollständig" }], assessments: {}, updatedAt: "2026-01-01" }),
      ),
    ).toThrow("Schülerdatenbank hat kein unterstütztes Datenformat");
  });

  it("gibt ungültiges JSON weiter, statt einen leeren Arbeitsstand zu speichern", () => {
    expect(() => parseDraftBundle("{nicht-json")).toThrow("Die gespeicherten Daten sind kein gültiges JSON.");
  });

  it("gibt eine unbekannte Schema-Version weiter, statt lokale Daten zu überschreiben", () => {
    expect(() => parseDraftBundle(JSON.stringify({ schemaVersion: 99, payload: legacyExam }))).toThrow(
      "wird von dieser App-Version nicht unterstützt",
    );
  });
});
