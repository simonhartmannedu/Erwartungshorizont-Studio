import { describe, expect, it } from "vitest";
import { examTemplates } from "./templates";

describe("school-form templates", () => {
  it("provides NRW-oriented examples for Grundschule and Realschule", () => {
    const primary = examTemplates.filter((template) => template.schoolForm === "grundschule");
    const realschule = examTemplates.filter((template) => template.schoolForm === "realschule");

    expect(primary.map((template) => template.subject)).toEqual(["Deutsch", "Mathematik"]);
    expect(realschule.map((template) => template.subject)).toEqual(["Deutsch", "Englisch"]);
  });

  it("does not prefill template metadata with example data", () => {
    const exam = examTemplates.find((template) => template.id === "grundschule-deutsch-lesen-schreiben")?.build();

    expect(exam?.meta).toEqual({
      schoolYear: "",
      subject: "",
      gradeLevel: "",
      course: "",
      teacher: "",
      examDate: "",
      title: "",
      unit: "",
      notes: "",
    });
  });
});
