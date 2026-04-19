import { Exam, Section } from "../types";
import { getSectionMaxPoints } from "./calculations";
import { round } from "./format";
import { scaleSectionTasksToTotal, allocatePointsByRatio } from "./writing";

const WEIGHT_STEP = 0.5;

export type SectionKind = "writing" | "language" | "receptive" | "other";

export interface SectionWeightRecommendation {
  min: number;
  max: number;
  typical: number;
  label: string;
}

const WEIGHT_RULES: Record<Exclude<SectionKind, "other">, SectionWeightRecommendation> = {
  writing: { min: 15, max: 25, typical: 20, label: "Schreiben" },
  receptive: { min: 25, max: 35, typical: 30, label: "Lesen / Hören / Sprachmittlung" },
  language: { min: 15, max: 35, typical: 25, label: "Sprache" },
};

const normalize = (value: string) => value.trim().toLocaleLowerCase("de-DE");

export const getSectionKind = (section: Section): SectionKind => {
  const title = normalize(section.title);

  if (title.includes("schreiben")) return "writing";
  if (title.includes("sprache")) return "language";
  if (title.includes("leseverstehen") || title.includes("hörverstehen") || title.includes("sprachmittlung")) {
    return "receptive";
  }

  return "other";
};

export const getSectionRecommendation = (section: Section) => {
  const kind = getSectionKind(section);
  return kind === "other" ? null : WEIGHT_RULES[kind];
};

export const syncSectionWeightsToPoints = (exam: Exam): Exam => {
  const allocations = allocatePointsByRatio(
    exam.sections.map((section) => ({
      value: section.id,
      basePoints: getSectionMaxPoints(section),
    })),
    100,
    WEIGHT_STEP,
  );
  const allocationMap = new Map(allocations.map((entry) => [entry.value, entry.allocated]));

  return {
    ...exam,
    sections: exam.sections.map((section) => ({
      ...section,
      weight: allocationMap.get(section.id) ?? 0,
    })),
  };
};

export const getNormalizedSectionPointTargets = (exam: Exam) => {
  const totalPoints = exam.sections.reduce((sum, section) => sum + getSectionMaxPoints(section), 0);
  const totalWeight = exam.sections.reduce((sum, section) => sum + Math.max(section.weight, 0), 0);
  if (totalPoints <= 0 || totalWeight <= 0) {
    return new Map<string, number>();
  }

  const allocations = allocatePointsByRatio(
    exam.sections.map((section) => ({
      value: section.id,
      basePoints: Math.max(section.weight, 0),
    })),
    totalPoints,
    WEIGHT_STEP,
  );

  return new Map(allocations.map((entry) => [entry.value, entry.allocated]));
};

export const hasSectionPointWeightMismatch = (exam: Exam) => {
  const targets = getNormalizedSectionPointTargets(exam);
  if (targets.size === 0) return false;

  return exam.sections.some((section) => {
    const target = targets.get(section.id);
    if (target == null) return false;
    return Math.abs(getSectionMaxPoints(section) - target) > 0.05;
  });
};

export const normalizeExamPointsToWeights = (exam: Exam): Exam => {
  const targets = getNormalizedSectionPointTargets(exam);
  if (targets.size === 0) return exam;

  return {
    ...exam,
    sections: exam.sections.map((section) => {
      const target = targets.get(section.id);
      if (target == null) return section;
      const scaled = scaleSectionTasksToTotal(section, target);
      return {
        ...scaled,
        weight: section.weight,
      };
    }),
  };
};

export const rebalanceExamForSectionWeight = (
  exam: Exam,
  sectionId: string,
  targetWeight: number,
): Exam => {
  const totalPoints = exam.sections.reduce((sum, section) => sum + getSectionMaxPoints(section), 0);
  if (totalPoints <= 0) return exam;

  const safeTargetWeight = Math.max(0, Math.min(100, round(targetWeight, 1)));
  const targetSection = exam.sections.find((section) => section.id === sectionId);
  if (!targetSection) return exam;

  const otherSections = exam.sections.filter((section) => section.id !== sectionId);
  const remainingWeight = Math.max(0, 100 - safeTargetWeight);

  const otherAllocations = allocatePointsByRatio(
    otherSections.map((section) => ({
      value: section.id,
      basePoints: getSectionMaxPoints(section),
    })),
    remainingWeight,
    WEIGHT_STEP,
  );
  const otherAllocationMap = new Map(otherAllocations.map((entry) => [entry.value, entry.allocated]));

  const nextSections = exam.sections.map((section) => {
    const nextWeight = section.id === sectionId
      ? safeTargetWeight
      : otherAllocationMap.get(section.id) ?? 0;
    const nextTotal = round((totalPoints * nextWeight) / 100, 1);
    const scaled = scaleSectionTasksToTotal(section, nextTotal);

    return {
      ...scaled,
      weight: nextWeight,
    };
  });

  return {
    ...exam,
    sections: nextSections,
  };
};
