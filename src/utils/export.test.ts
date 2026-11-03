import { describe, expect, it } from "vitest";
import { sampleExam } from "../data/sampleExam";
import { calculateExamSummary } from "./calculations";
import { buildCsvContent, getTaskDocumentText, renderPrintDocument } from "./export";

describe("Dokumentausgabe", () => {
  const task = {
    id: "task-1",
    title: "Begründung",
    description: "Begründe deine Entscheidung mit einer Textstelle.",
    expectation: "Die Textstelle passt zur gewählten Entscheidung.",
    category: "",
    maxPoints: 4,
    achievedPoints: 3,
  };

  it("hält Aufgabenwortlaut und Erwartung im Word-Export zusammen", () => {
    expect(getTaskDocumentText(task, true)).toBe(
      "Begründe deine Entscheidung mit einer Textstelle.\nErwartung: Die Textstelle passt zur gewählten Entscheidung.",
    );
    expect(getTaskDocumentText(task, false)).toBe("Begründe deine Entscheidung mit einer Textstelle.");
  });

  it("verwendet dieselben Sichtbarkeitsregeln für Druck-PDF und Word", () => {
    const exam = structuredClone(sampleExam);
    exam.sections = [{
      id: "section-1",
      title: "Textverständnis",
      description: "",
      linkedSectionId: null,
      maxPointsOverride: null,
      note: "",
      tasks: [task],
    }];
    exam.printSettings = {
      ...exam.printSettings,
      showExpectations: false,
      showTeacherComment: false,
    };

    const document = renderPrintDocument([{
      exam,
      summary: calculateExamSummary(exam),
      identity: { alias: "E8B-01", teacherComment: "Individuelle Rückmeldung" },
    }]);

    expect(document).toContain("Begründe deine Entscheidung mit einer Textstelle.");
    expect(document).not.toContain("Die Textstelle passt zur gewählten Entscheidung.");
    expect(document).not.toContain("Individuelle Rückmeldung");
  });
});

describe("CSV-Export", () => {
  it("schreibt Namen mit deutschen Umlauten als UTF-8 mit BOM", () => {
    expect(buildCsvContent([
      { Schuelername: "Änne Özdemir", Klasse: "10a" },
      { Schuelername: "Ümit Müller", Klasse: "10a" },
    ])).toBe(
      "\uFEFF\"Schuelername\";\"Klasse\"\r\n\"Änne Özdemir\";\"10a\"\r\n\"Ümit Müller\";\"10a\"",
    );
  });
});
