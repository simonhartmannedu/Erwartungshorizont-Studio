import {
  GradeAccumulationMode,
  GradeBand,
  GradeScale,
  GradeScaleGeneratorSettings,
  GradeScaleRecommendedStage,
} from "../types";
import { clamp } from "./format";

const tendencyBands: ReadonlyArray<Pick<GradeBand, "label" | "verbalLabel" | "color">> = [
  { label: "1+", verbalLabel: "sehr gut plus", color: "#166534" },
  { label: "1", verbalLabel: "sehr gut", color: "#15803d" },
  { label: "1-", verbalLabel: "sehr gut minus", color: "#16a34a" },
  { label: "2+", verbalLabel: "gut plus", color: "#65a30d" },
  { label: "2", verbalLabel: "gut", color: "#84cc16" },
  { label: "2-", verbalLabel: "gut minus", color: "#a3e635" },
  { label: "3+", verbalLabel: "befriedigend plus", color: "#facc15" },
  { label: "3", verbalLabel: "befriedigend", color: "#f59e0b" },
  { label: "3-", verbalLabel: "befriedigend minus", color: "#fb923c" },
  { label: "4+", verbalLabel: "ausreichend plus", color: "#f97316" },
  { label: "4", verbalLabel: "ausreichend", color: "#ea580c" },
  { label: "4-", verbalLabel: "ausreichend minus", color: "#dc2626" },
  { label: "5+", verbalLabel: "mangelhaft plus", color: "#dc2626" },
  { label: "5", verbalLabel: "mangelhaft", color: "#b91c1c" },
  { label: "5-", verbalLabel: "mangelhaft minus", color: "#991b1b" },
  { label: "6", verbalLabel: "ungenügend", color: "#7f1d1d" },
] as const;

const wholeGradeBands: ReadonlyArray<Pick<GradeBand, "label" | "verbalLabel" | "color">> = [
  { label: "1", verbalLabel: "sehr gut", color: "#15803d" },
  { label: "2", verbalLabel: "gut", color: "#84cc16" },
  { label: "3", verbalLabel: "befriedigend", color: "#f59e0b" },
  { label: "4", verbalLabel: "ausreichend", color: "#dc2626" },
  { label: "5", verbalLabel: "mangelhaft", color: "#b91c1c" },
  { label: "6", verbalLabel: "ungenügend", color: "#7f1d1d" },
] as const;

const roundToStep = (value: number, step: number) => Math.round(value / step) * step;

const roundBoundary = (value: number, mode: GradeAccumulationMode) => {
  switch (mode) {
    case "top":
      return Math.ceil(value);
    case "bottom":
      return Math.floor(value);
    case "middle":
    default:
      return Math.round(value);
  }
};

const buildWidths = (slots: number, parts: number, mode: GradeAccumulationMode) => {
  if (parts <= 0) return [];

  const widths: number[] = [];

  for (let index = 0; index < parts; index += 1) {
    const previousBoundary = roundBoundary((index * slots) / parts, mode);
    const nextBoundary = roundBoundary(((index + 1) * slots) / parts, mode);
    widths.push(Math.max(0, nextBoundary - previousBoundary));
  }

  return widths;
};

const buildBandsFromWidths = ({
  template,
  maxPoints,
  step,
  widths,
}: {
  template: ReadonlyArray<Pick<GradeBand, "label" | "verbalLabel" | "color">>;
  maxPoints: number;
  step: number;
  widths: number[];
}) => {
  let currentUpper = maxPoints;

  return template.map((band, index) => {
    const width = widths[index] ?? 1;
    const lowerBound = Math.max(0, Number((currentUpper - (width - 1) * step).toFixed(4)));
    currentUpper = Math.max(0, Number((lowerBound - step).toFixed(4)));

    return {
      id: crypto.randomUUID(),
      label: band.label,
      verbalLabel: band.verbalLabel,
      lowerBound,
      color: band.color,
    };
  });
};

const getGeneratorTitle = (recommendedStage: GradeScaleRecommendedStage | null) => {
  if (recommendedStage === "sek1") return "Generierter Notenschlüssel (Sek I / 50%-Logik)";
  if (recommendedStage === "sek2") return "Generierter Notenschlüssel (Sek II / 45%-Logik)";
  return "Generierter Notenschlüssel";
};

export const createGradeScaleGeneratorSettings = (
  recommendedStage: GradeScaleRecommendedStage | null = null,
): GradeScaleGeneratorSettings => ({
  source: "manual",
  thresholdPercent: recommendedStage === "sek1" ? 50 : 45,
  accumulationMode: "middle",
  useHalfPoints: false,
  showTendency: true,
  recommendedStage,
});

export const createNotengeneratorSettings = (
  recommendedStage: GradeScaleRecommendedStage | null,
  patch: Partial<Omit<GradeScaleGeneratorSettings, "source">> = {},
): GradeScaleGeneratorSettings => ({
  ...createGradeScaleGeneratorSettings(recommendedStage),
  source: "notengenerator",
  ...patch,
});

export const generateNotengeneratorGradeBands = (
  maximumPoints: number,
  settings: GradeScaleGeneratorSettings,
): GradeBand[] => {
  const safeMaximumPoints = Math.max(settings.useHalfPoints ? 0.5 : 1, maximumPoints);
  const step = settings.useHalfPoints ? 0.5 : 1;
  const thresholdRatio = clamp(settings.thresholdPercent, 20, 80) / 100;
  const rawThresholdPoints = safeMaximumPoints * thresholdRatio;
  const thresholdLowerBound = clamp(roundToStep(rawThresholdPoints, step), step, safeMaximumPoints);
  const deficiencyBoundary = clamp(roundToStep(rawThresholdPoints / 2, step), 0, thresholdLowerBound);

  if (!settings.showTendency) {
    const topSlots = Math.round((safeMaximumPoints - thresholdLowerBound) / step) + 1;
    const failSlots = Math.max(0, Math.round((thresholdLowerBound - deficiencyBoundary) / step));
    const insufficientSlots = Math.round(deficiencyBoundary / step) + 1;
    const widths = [
      ...buildWidths(topSlots, 4, settings.accumulationMode),
      failSlots,
      insufficientSlots,
    ];

    return buildBandsFromWidths({
      template: wholeGradeBands,
      maxPoints: safeMaximumPoints,
      step,
      widths,
    });
  }

  const topSlots = Math.round((safeMaximumPoints - thresholdLowerBound) / step) + 1;
  const weakPassSlots = Math.max(0, Math.round((thresholdLowerBound - deficiencyBoundary) / step));
  const insufficientSlots = Math.round(deficiencyBoundary / step) + 1;
  const widths = [
    ...buildWidths(topSlots, 12, settings.accumulationMode),
    ...buildWidths(weakPassSlots, 3, settings.accumulationMode),
    insufficientSlots,
  ];

  return buildBandsFromWidths({
    template: tendencyBands,
    maxPoints: safeMaximumPoints,
    step,
    widths,
  });
};

export const getEffectiveGradeScaleMode = (scale: GradeScale) =>
  scale.generator.source === "notengenerator" ? "points" : scale.mode;

export const getEffectiveGradeBands = (scale: GradeScale, totalMaxPoints: number) =>
  scale.generator.source === "notengenerator"
    ? generateNotengeneratorGradeBands(totalMaxPoints, scale.generator)
    : scale.bands;

export const applyNotengeneratorGradeScale = (
  scale: GradeScale,
  totalMaxPoints: number,
  patch: Partial<Omit<GradeScaleGeneratorSettings, "source">> = {},
): GradeScale => {
  const nextGenerator = {
    ...scale.generator,
    source: "notengenerator" as const,
    ...patch,
  };

  return {
    ...scale,
    mode: "points",
    title: getGeneratorTitle(nextGenerator.recommendedStage),
    generator: nextGenerator,
    bands: generateNotengeneratorGradeBands(totalMaxPoints, nextGenerator),
  };
};

export const convertGeneratedScaleToManual = (scale: GradeScale, totalMaxPoints: number): GradeScale => ({
  ...scale,
  title: scale.title || "Manueller Notenschlüssel",
  generator: {
    ...scale.generator,
    source: "manual",
  },
  bands: getEffectiveGradeBands(scale, totalMaxPoints),
});
