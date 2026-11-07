import { describe, expect, it } from "vitest";
import { examTemplates } from "./templates";

describe("school-form templates", () => {
  it("leaves answers and expectations empty in every built-in task", () => {
    for (const template of examTemplates) {
      const tasks = template.build().sections.flatMap((section) => section.tasks);
      expect(tasks.length, template.id).toBeGreaterThan(0);
      for (const task of tasks) {
        expect(task.description, `${template.id}: ${task.title}`).toBe("");
        expect(task.expectation, `${template.id}: ${task.title}`).toBe("");
      }
    }
  });
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
