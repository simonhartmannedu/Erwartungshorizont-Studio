import { describe, expect, it } from "vitest";
import { Exam, GradeScale } from "../types";
import { calculateExamSummary } from "./calculations";
import { round } from "./format";
import { resolveGrade } from "./grades";

const gradeScale: GradeScale = {
  id: "grade-scale-1",
  title: "Test scale",
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
  bands: [
    { id: "grade-1", label: "1", verbalLabel: "sehr gut", lowerBound: 90, color: "#15803d" },
    { id: "grade-2", label: "2", verbalLabel: "gut", lowerBound: 75, color: "#65a30d" },
    { id: "grade-6", label: "6", verbalLabel: "ungenügend", lowerBound: 0, color: "#dc2626" },
  ],
};

const exam: Exam = {
  id: "exam-1",
  meta: {
    schoolYear: "2026/27",
    subject: "Englisch",
    gradeLevel: "8",
    course: "",
    teacher: "Test",
    examDate: "2026-08-01",
    title: "Testarbeit",
    unit: "",
    notes: "",
  },
  evaluationMode: "direct",
  gradeScale,
  printSettings: {
    showExpectations: true,
    showTeacherComment: true,
    compactRows: false,
    showWeightedOverview: false,
  },
  sections: [
    {
      id: "section-a",
      title: "A",
      description: "",
      weight: 60,
      linkedSectionId: null,
      maxPointsOverride: null,
      note: "",
      tasks: [
        { id: "task-a", title: "A", description: "", category: "", maxPoints: 10, achievedPoints: 8, expectation: "" },
      ],
    },
    {
      id: "section-b",
      title: "B",
      description: "",
      weight: 40,
      linkedSectionId: null,
      maxPointsOverride: 10,
      note: "",
      tasks: [
        { id: "task-b", title: "B", description: "", category: "", maxPoints: 5, achievedPoints: 14, expectation: "" },
      ],
    },
  ],
};

describe("Berechnungen", () => {
  it("berechnet Abschnitts- und Gesamtwerte und begrenzt Prozentwerte", () => {
    const summary = calculateExamSummary(exam);

    expect(summary.totalMaxPoints).toBe(20);
    expect(summary.totalAchievedPoints).toBe(22);
    expect(summary.rawPercentage).toBeCloseTo(110);
    expect(summary.finalPercentage).toBe(100);
    expect(summary.weightedPercentage).toBe(88);
    expect(summary.sectionResults[1]).toMatchObject({ maxPoints: 10, achievedPoints: 14, percentage: 100 });
    expect(summary.grade.label).toBe("1");
  });

  it("wendet Notengrenzen einschließlich der Untergrenze deterministisch an", () => {
    expect(resolveGrade(gradeScale, 75).label).toBe("2");
    expect(resolveGrade(gradeScale, 74.9).label).toBe("6");
  });

  it("rundet auf die angegebene Anzahl Nachkommastellen", () => {
    expect(round(1.25, 1)).toBe(1.3);
    expect(round(8.126, 2)).toBe(8.13);
  });
});
