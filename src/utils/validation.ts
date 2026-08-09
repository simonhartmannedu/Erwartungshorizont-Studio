import { Exam, SectionResult, ValidationIssue } from "../types";
import { getWritingLanguageMetrics } from "./writing";

export const validateExam = (
  exam: Exam,
  sectionResults: SectionResult[],
): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];

  if (!exam.meta.title.trim()) {
    issues.push({
      id: crypto.randomUUID(),
      level: "warning",
      message: "Der Titel der Klassenarbeit ist noch leer.",
    });
  }

  exam.sections.forEach((section, sectionIndex) => {
    const writingMetrics = getWritingLanguageMetrics(section);
    if (writingMetrics && !writingMetrics.isCompliant) {
      issues.push({
        id: crypto.randomUUID(),
        level: "warning",
        message: `${section.title || `Aufgabenteil ${sectionIndex + 1}`}: Sprache muss 60 % der Abschnittspunkte abbilden.`,
      });
    }

    if (!section.title.trim()) {
      issues.push({
        id: crypto.randomUUID(),
        level: "warning",
        message: `Aufgabenteil ${sectionIndex + 1} hat keinen Titel.`,
      });
    }

    section.tasks.forEach((task, taskIndex) => {
      if (task.achievedPoints > task.maxPoints) {
        issues.push({
          id: crypto.randomUUID(),
          level: "error",
          message: `${section.title || `Aufgabenteil ${sectionIndex + 1}`} · ${task.title || `Aufgabe ${taskIndex + 1}`}: erreichte Punkte übersteigen die Maximalpunkte.`,
        });
      }

      if (!task.title.trim()) {
        issues.push({
          id: crypto.randomUUID(),
          level: "warning",
          message: `${section.title || `Aufgabenteil ${sectionIndex + 1}`} enthält eine Unteraufgabe ohne Titel.`,
        });
      }
    });
  });

  if (sectionResults.every((section) => section.maxPoints === 0)) {
    issues.push({
      id: crypto.randomUUID(),
      level: "warning",
      message: "Es sind noch keine bewertbaren Maximalpunkte hinterlegt.",
    });
  }

  return issues;
};
