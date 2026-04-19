import { Exam } from "../types";
import { formatNumber } from "../utils/format";
import { getEffectiveGradeScaleMode } from "../utils/gradeScaleGenerator";
import { getGradeScaleRangeDigits, getGradeScaleRanges } from "../utils/gradeScaleRanges";

export const GradeScaleRangeSection = ({
  exam,
  totalMaxPoints,
  title = "Notenschlüssel in Punkten",
  subtitle,
  className = "",
}: {
  exam: Exam;
  totalMaxPoints: number;
  title?: string;
  subtitle?: string;
  className?: string;
}) => {
  const gradeRanges = getGradeScaleRanges(exam, totalMaxPoints);
  const rangeDigits = getGradeScaleRangeDigits(exam, totalMaxPoints);

  return (
    <section className={`surface-elevated rounded-3xl border p-4 ${className}`.trim()}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="themed-strong text-base font-semibold">{title}</h3>
          <p className="themed-muted">
            {subtitle || `Punktespannen je Note bei insgesamt ${formatNumber(totalMaxPoints)} erreichbaren Punkten.`}
          </p>
        </div>
        <div className="surface-elevated rounded-full border px-3 py-1 text-xs font-semibold">
          {getEffectiveGradeScaleMode(exam.gradeScale) === "points" ? "Punkteschlüssel" : "Aus Prozent umgerechnet"}
        </div>
      </div>
      <div className="themed-table-shell overflow-x-auto rounded-2xl border">
        <table className="min-w-full">
          <thead>
            <tr className="themed-table-head text-left text-xs uppercase tracking-[0.16em]">
              {gradeRanges.map((band) => (
                <th key={band.id} className="px-4 py-3 text-center">
                  {band.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="themed-table-body">
            <tr className="themed-table-row">
              {gradeRanges.map((band) => (
                <td key={band.id} className="themed-strong px-4 py-3 text-center text-[10px] font-semibold">
                  {formatNumber(band.lowerBound, rangeDigits)} - {formatNumber(band.upperBound, rangeDigits)} P.
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
};
