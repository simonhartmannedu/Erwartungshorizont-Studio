import { useEffect, useMemo, useState } from "react";
import { Exam, ExamSummary } from "../types";
import { formatNumber } from "../utils/format";
import { SECTION_CHART_PALETTE } from "../utils/sectionChart";
import { Card } from "./ui";

const polarToCartesian = (cx: number, cy: number, radius: number, angleInDegrees: number) => {
  const radians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
};

const describeDonutSlice = (
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
) => {
  const angleSpan = Math.max(endAngle - startAngle, 0.001);
  const safeEndAngle = angleSpan >= 360 ? startAngle + 359.99 : endAngle;
  const largeArcFlag = safeEndAngle - startAngle > 180 ? 1 : 0;
  const outerStart = polarToCartesian(cx, cy, outerRadius, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerRadius, safeEndAngle);
  const innerEnd = polarToCartesian(cx, cy, innerRadius, safeEndAngle);
  const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle);

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
};

const getSectionColor = (index: number) => {
  if (index < SECTION_CHART_PALETTE.length) return SECTION_CHART_PALETTE[index];

  // Beyond the curated first six colors, advance through the hue circle with a
  // golden-angle step. This keeps neighbouring sections visually distinct.
  const hue = Math.round((index * 137.508 + 18) % 360);
  return `hsl(${hue} 66% 35%)`;
};

export const SectionAllocationOverview = ({
  exam,
  summary,
}: {
  exam: Exam;
  summary: ExamSummary;
}) => {
  const [activeSectionId, setActiveSectionId] = useState("");
  const slices = useMemo(() => {
    const totalPoints = summary.totalMaxPoints;
    let currentAngle = 0;

    return exam.sections.map((section, index) => {
      const points = summary.sectionResults.find((result) => result.sectionId === section.id)?.maxPoints ?? 0;
      const percentage = totalPoints > 0 ? (points / totalPoints) * 100 : 0;
      const startAngle = currentAngle;
      currentAngle += (percentage / 100) * 360;
      const middleAngle = startAngle + (currentAngle - startAngle) / 2;
      const labelPosition = polarToCartesian(110, 110, 78, middleAngle);
      const normalizedRotation = ((middleAngle % 360) + 360) % 360;
      const labelRotation = normalizedRotation > 90 && normalizedRotation < 270
        ? normalizedRotation - 180
        : normalizedRotation;

      return {
        id: section.id,
        title: section.title.trim() || `Abschnitt ${index + 1}`,
        points,
        percentage,
        color: getSectionColor(index),
        path: describeDonutSlice(110, 110, 58, 98, startAngle, currentAngle),
        labelX: labelPosition.x,
        labelY: labelPosition.y,
        labelRotation,
        labelSize: percentage < 5 ? 8 : percentage < 10 ? 10 : 12,
      };
    });
  }, [exam.sections, summary.sectionResults, summary.totalMaxPoints]);

  useEffect(() => {
    if (activeSectionId && !slices.some((slice) => slice.id === activeSectionId)) {
      setActiveSectionId("");
    }
  }, [activeSectionId, slices]);

  const activeSlice = slices.find((slice) => slice.id === activeSectionId) ?? null;

  return (
    <Card
      title="Punkteanteile"
      subtitle="Die Gewichtung aktualisiert sich direkt, wenn du Abschnitte oder Punkte im EWH änderst."
      className="editor-allocation-overview no-print"
    >
      {slices.length > 0 && summary.totalMaxPoints > 0 ? (
        <div className="editor-allocation-chart">
          <div className="editor-allocation-donut-shell">
            <svg
              className="editor-allocation-donut"
              viewBox="0 0 220 220"
              role="img"
              aria-label="Prozentuale Verteilung der Gesamtpunkte auf die Abschnitte"
            >
              <circle className="editor-allocation-donut-track" cx="110" cy="110" r="78" />
              {slices.map((slice) => {
                const active = slice.id === activeSlice?.id;
                return (
                  <path
                    key={slice.id}
                    className={`editor-allocation-donut-slice ${active ? "editor-allocation-donut-slice-active" : ""}`}
                    d={slice.path}
                    fill={slice.color}
                    role="button"
                    tabIndex={0}
                    aria-label={`${slice.title}: ${formatNumber(slice.points)} Punkte, ${formatNumber(slice.percentage)} Prozent`}
                    onClick={() => setActiveSectionId(slice.id)}
                    onFocus={() => setActiveSectionId(slice.id)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      setActiveSectionId(slice.id);
                    }}
                  />
                );
              })}
              {slices.map((slice) => (
                <text
                  key={`${slice.id}-label`}
                  className="editor-allocation-donut-label"
                  x={slice.labelX}
                  y={slice.labelY}
                  fontSize={slice.labelSize}
                  transform={`rotate(${slice.labelRotation} ${slice.labelX} ${slice.labelY})`}
                  aria-hidden="true"
                >
                  {formatNumber(slice.percentage)}%
                </text>
              ))}
            </svg>
            <div className="editor-allocation-donut-center" aria-hidden="true">
              <strong>{formatNumber(summary.totalMaxPoints)}</strong>
              <span>Punkte</span>
            </div>
          </div>

          {activeSlice ? (
            <div className="editor-allocation-active" aria-live="polite">
              <span>{activeSlice.title}</span>
              <strong>{formatNumber(activeSlice.points)} P. · {formatNumber(activeSlice.percentage)}%</strong>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="status-note text-sm leading-6">
          Sobald Punkte in den Abschnitten hinterlegt sind, erscheint hier ihre Gewichtung.
        </p>
      )}
    </Card>
  );
};
