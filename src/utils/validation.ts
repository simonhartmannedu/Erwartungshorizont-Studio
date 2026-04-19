import { Exam, SectionResult, ValidationIssue } from "../types";
import { getNormalizedSectionPointTargets, getSectionRecommendation } from "./sectionWeights";
import { getWritingLanguageMetrics } from "./writing";

const getSectionMaxPoints = (section: Exam["sections"][number]) =>
  (typeof section.maxPointsOverride === "number" && Number.isFinite(section.maxPointsOverride) && section.maxPointsOverride > 0
    ? section.maxPointsOverride
    : section.tasks.reduce((sum, task) => sum + (Number.isFinite(task.maxPoints) ? task.maxPoints : 0), 0));

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

  const totalWeight = exam.sections.reduce((sum, section) => sum + section.weight, 0);
  if (Math.round(totalWeight * 10) / 10 !== 100) {
    issues.push({
      id: crypto.randomUUID(),
      level: "warning",
      message: `Die Gewichtungen ergeben aktuell ${totalWeight} % statt 100 %.`,
    });
  }

  const pointTargets = getNormalizedSectionPointTargets(exam);
  exam.sections.forEach((section, sectionIndex) => {
    const target = pointTargets.get(section.id);
    if (target == null) return;
    const currentPoints = getSectionMaxPoints(section);
    if (Math.abs(currentPoints - target) > 0.05) {
      issues.push({
        id: crypto.randomUUID(),
        level: "warning",
        message:
          `${section.title || `Aufgabenteil ${sectionIndex + 1}`}: ` +
          `Maximalpunkte (${currentPoints}) passen noch nicht zur Gewichtung von ${section.weight} %. Ziel wären ${target} Punkte.`,
      });
    }
  });

  exam.sections.forEach((section, sectionIndex) => {
    const recommendation = getSectionRecommendation(section);
    if (recommendation) {
      if (section.weight > recommendation.max) {
        issues.push({
          id: crypto.randomUUID(),
          level: "error",
          message:
            `${section.title || `Aufgabenteil ${sectionIndex + 1}`}: ` +
            `${recommendation.label} liegt bei ${section.weight} % und überschreitet die empfohlene Obergrenze von ${recommendation.max} %.`,
        });
      } else if (section.weight < recommendation.min) {
        issues.push({
          id: crypto.randomUUID(),
          level: "warning",
          message:
            `${section.title || `Aufgabenteil ${sectionIndex + 1}`}: ` +
            `${recommendation.label} liegt bei ${section.weight} % und unterschreitet die empfohlene Untergrenze von ${recommendation.min} %.`,
        });
      }
    }

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
