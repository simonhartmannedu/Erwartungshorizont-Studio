import { Exam, ExamSummary } from "../types";

export interface SectionChartSegment {
  sectionId: string;
  title: string;
  weight: number;
  percentage: number;
  achievedPoints: number;
  maxPoints: number;
  color: string;
  startAngle: number;
  endAngle: number;
  backgroundPath: string;
  valuePath: string;
}

export const SECTION_CHART_PALETTE = ["#0f766e", "#c2410c", "#1d4ed8", "#7c3aed", "#be123c", "#15803d"];

const polarToCartesian = (cx: number, cy: number, radius: number, angleInDegrees: number) => {
  const radians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
};

const describeSector = (
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
) => {
  const angleSpan = Math.max(endAngle - startAngle, 0.001);
  const largeArcFlag = angleSpan > 180 ? 1 : 0;
  const outerStart = polarToCartesian(cx, cy, outerRadius, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerRadius, endAngle);
  const innerEnd = polarToCartesian(cx, cy, innerRadius, endAngle);
  const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle);

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
};

export const getSectionChartSegments = (
  exam: Exam,
  summary: ExamSummary,
  config: { size?: number; innerRadius?: number; outerRadius?: number } = {},
): SectionChartSegment[] => {
  const size = config.size ?? 280;
  const innerRadius = config.innerRadius ?? 34;
  const outerRadius = config.outerRadius ?? size / 2 - 18;
  const cx = size / 2;
  const cy = size / 2;
  const totalWeight = exam.sections.reduce((sum, section) => sum + Math.max(section.weight, 0), 0) || 1;

  let currentAngle = 0;
  return exam.sections.map((section, index) => {
    const result = summary.sectionResults.find((entry) => entry.sectionId === section.id);
    const angleSpan = (Math.max(section.weight, 0) / totalWeight) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angleSpan;
    currentAngle = endAngle;

    const percentage = result?.percentage ?? 0;
    const achievedPoints = result?.achievedPoints ?? 0;
    const maxPoints = result?.maxPoints ?? 0;
    const valueOuterRadius = innerRadius + (outerRadius - innerRadius) * (percentage / 100);
    const color = SECTION_CHART_PALETTE[index % SECTION_CHART_PALETTE.length];

    return {
      sectionId: section.id,
      title: section.title,
      weight: section.weight,
      percentage,
      achievedPoints,
      maxPoints,
      color,
      startAngle,
      endAngle,
      backgroundPath: describeSector(cx, cy, innerRadius, outerRadius, startAngle, endAngle),
      valuePath: describeSector(cx, cy, innerRadius, valueOuterRadius, startAngle, endAngle),
    };
  });
};
