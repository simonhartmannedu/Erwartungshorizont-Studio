import { GradeResult, GradeScale, NextGradeProgress } from "../types";
import { clamp } from "./format";
import {
  applyNotengeneratorGradeScale,
  createNotengeneratorSettings,
  getEffectiveGradeBands,
  getEffectiveGradeScaleMode,
} from "./gradeScaleGenerator";

export const createDefaultGradeScale = (): GradeScale =>
  applyNotengeneratorGradeScale(
    {
      id: crypto.randomUUID(),
      title: "NRW-kompatibler Standardschlüssel",
      mode: "points",
      schoolMode: "numericWithComment",
      commentTemplate:
        "Leistungseindruck: Die Bewertung orientiert sich an einem anpassbaren NRW-kompatiblen Schlüsselschema.",
      generator: createNotengeneratorSettings(null),
      bands: [],
    },
    100,
  );

export const resolveGrade = (
  scale: GradeScale,
  referenceValue: number,
  totalMaxPoints?: number,
): GradeResult => {
  const sorted = [...getEffectiveGradeBands(scale, totalMaxPoints ?? 100)].sort((a, b) => b.lowerBound - a.lowerBound);
  const band =
    sorted.find((entry) => referenceValue >= entry.lowerBound) ?? sorted[sorted.length - 1]!;

  const schoolDisplay =
    scale.schoolMode === "verbal"
      ? band.verbalLabel
      : scale.schoolMode === "numericWithComment"
        ? `${band.label} · ${band.verbalLabel}`
        : band.label;

  return {
    label: band.label,
    verbalLabel: band.verbalLabel,
    lowerBound: band.lowerBound,
    schoolDisplay,
  };
};

export const getNextGradeProgress = ({
  scale,
  referenceValue,
  totalAchievedPoints,
  totalMaxPoints,
}: {
  scale: GradeScale;
  referenceValue: number;
  totalAchievedPoints: number;
  totalMaxPoints: number;
}): NextGradeProgress => {
  const sorted = [...getEffectiveGradeBands(scale, totalMaxPoints)].sort((a, b) => b.lowerBound - a.lowerBound);
  const currentIndex = sorted.findIndex((entry) => referenceValue >= entry.lowerBound);
  const safeCurrentIndex = currentIndex >= 0 ? currentIndex : sorted.length - 1;
  const currentBand = sorted[safeCurrentIndex] ?? sorted[sorted.length - 1];
  const nextBand = safeCurrentIndex > 0 ? sorted[safeCurrentIndex - 1] : null;

  if (!currentBand || !nextBand) {
    return {
      currentValue: referenceValue,
      nextValue: null,
      currentBandProgress: 1,
      pointsNeeded: 0,
      nextGradeLabel: null,
      nextGradeVerbalLabel: null,
    };
  }

  const bandSpan = nextBand.lowerBound - currentBand.lowerBound;
  const currentBandProgress =
    bandSpan > 0 ? clamp((referenceValue - currentBand.lowerBound) / bandSpan, 0, 1) : 1;

  const pointsNeeded =
    getEffectiveGradeScaleMode(scale) === "points"
      ? Math.max(nextBand.lowerBound - totalAchievedPoints, 0)
      : totalMaxPoints > 0
        ? Math.max((nextBand.lowerBound / 100) * totalMaxPoints - totalAchievedPoints, 0)
        : 0;

  return {
    currentValue: referenceValue,
    nextValue: nextBand.lowerBound,
    currentBandProgress,
    pointsNeeded,
    nextGradeLabel: nextBand.label,
    nextGradeVerbalLabel: nextBand.verbalLabel,
  };
};

export const gradeLabelToNumericValue = (label: string) => {
  switch (label.trim()) {
    case "1+":
      return 0.7;
    case "1":
      return 1.0;
    case "1-":
      return 1.3;
    case "2+":
      return 1.7;
    case "2":
      return 2.0;
    case "2-":
      return 2.3;
    case "3+":
      return 2.7;
    case "3":
      return 3.0;
    case "3-":
      return 3.3;
    case "4+":
      return 3.7;
    case "4":
      return 4.0;
    case "4-":
      return 4.3;
    case "5+":
      return 4.7;
    case "5":
      return 5.0;
    case "5-":
      return 5.3;
    case "6":
      return 6.0;
    default:
      return null;
  }
};
