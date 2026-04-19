import { Exam } from "../types";
import { clamp } from "./format";
import { getEffectiveGradeBands, getEffectiveGradeScaleMode } from "./gradeScaleGenerator";

export interface GradeScaleRange {
  id: string;
  label: string;
  lowerBound: number;
  upperBound: number;
}

const getGradeThresholdPoints = (exam: Exam, totalMaxPoints: number, lowerBound: number) => {
  if (getEffectiveGradeScaleMode(exam.gradeScale) === "points") {
    return clamp(lowerBound, 0, totalMaxPoints);
  }

  return clamp((totalMaxPoints * lowerBound) / 100, 0, totalMaxPoints);
};

const hasFraction = (value: number) => Math.abs(value - Math.round(value)) > 0.0001;
const roundUpToStep = (value: number, step: number) => Math.ceil(value / step) * step;

const getGradeRangeDisplayStep = (exam: Exam, totalMaxPoints: number) => {
  const thresholdValues = getEffectiveGradeBands(exam.gradeScale, totalMaxPoints).map((band) =>
    getGradeThresholdPoints(exam, totalMaxPoints, band.lowerBound),
  );

  return hasFraction(totalMaxPoints) || thresholdValues.some((value) => hasFraction(value)) ? 0.5 : 1;
};

export const getGradeScaleRangeDigits = (exam: Exam, totalMaxPoints: number) => {
  return getGradeRangeDisplayStep(exam, totalMaxPoints) === 0.5 ? 1 : 0;
};

export const getGradeScaleRanges = (exam: Exam, totalMaxPoints: number): GradeScaleRange[] => {
  const rangeStep = getGradeRangeDisplayStep(exam, totalMaxPoints);
  const displayMaxPoints = roundUpToStep(totalMaxPoints, rangeStep);
  const sortedThresholds = [...getEffectiveGradeBands(exam.gradeScale, totalMaxPoints)]
    .sort((a, b) => b.lowerBound - a.lowerBound)
    .map((band) => ({
      id: band.id,
      label: band.label,
      thresholdPoints: roundUpToStep(
        getGradeThresholdPoints(exam, totalMaxPoints, band.lowerBound),
        rangeStep,
      ),
    }));

  return sortedThresholds.map((band, index) => {
    const previousBand = sortedThresholds[index - 1];
    const upperBound = previousBand
      ? Math.max(band.thresholdPoints, previousBand.thresholdPoints - rangeStep)
      : displayMaxPoints;

    return {
      id: band.id,
      label: band.label,
      lowerBound: band.thresholdPoints,
      upperBound,
    };
  });
};
