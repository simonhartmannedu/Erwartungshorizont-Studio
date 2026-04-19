import { useEffect, useMemo, useState } from "react";
import { PointScalingPreview } from "../types";
import { formatNumber } from "../utils/format";
import { CheckIcon, MinusIcon, PlusIcon } from "./icons";
import { Card, Field } from "./ui";

interface Props {
  currentTotal: number;
  onApply: (targetTotal: number, scaleAchieved: boolean) => void;
  embedded?: boolean;
}

export const PointScaleControl = ({ currentTotal, onApply, embedded = false }: Props) => {
  const [targetTotal, setTargetTotal] = useState(currentTotal);
  const [scaleAchieved, setScaleAchieved] = useState(false);

  useEffect(() => {
    setTargetTotal(currentTotal);
  }, [currentTotal]);

  const preview: PointScalingPreview = {
    originalTotal: currentTotal,
    targetTotal,
    factor: currentTotal > 0 ? targetTotal / currentTotal : 1,
  };

  const quickTargets = useMemo(() => {
    const dynamic = [
      currentTotal,
      Math.round(currentTotal * 0.8),
      Math.round(currentTotal * 0.9),
      Math.round(currentTotal * 1.1),
      Math.round(currentTotal * 1.25),
      40,
      50,
      60,
      80,
      100,
    ];

    return [...new Set(dynamic)]
      .filter((value) => value > 0)
      .sort((a, b) => a - b)
      .slice(0, 8);
  }, [currentTotal]);

  const adjustTarget = (delta: number) => {
    setTargetTotal((current) => Math.max(0, current + delta));
  };

  const content = (
    <>
      <div className="point-calibrator rounded-[28px] border p-4 sm:p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(250px,0.8fr)]">
          <div className="point-calibrator-panel rounded-[24px] border p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="point-hero-label text-xs font-semibold uppercase tracking-[0.18em]">Zielsumme</p>
                <div className="mt-3 flex items-end gap-3">
                  <p className="point-hero-value text-5xl font-semibold leading-none">{formatNumber(preview.targetTotal, 0)}</p>
                  <span className="point-hero-label pb-1 text-sm font-medium">Punkte</span>
                </div>
                <p className="point-hero-label mt-3 text-sm">
                  Ausgangswert: {formatNumber(preview.originalTotal, 0)} Punkte
                </p>
              </div>
              <div className="point-factor-badge rounded-3xl px-4 py-3 text-right">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-80">Skalierungsfaktor</p>
                <p className="mt-1 text-2xl font-semibold">{formatNumber(preview.factor, 3)}</p>
              </div>
            </div>

            <div className="point-stepper mt-5 rounded-[22px] border p-2">
              <div className="grid grid-cols-4 gap-2">
                <button type="button" className="point-step-button rounded-2xl border px-3 py-3 text-sm font-semibold" onClick={() => adjustTarget(-10)}>
                  <span className="inline-flex items-center gap-2"><MinusIcon className="h-4 w-4" />10</span>
                </button>
                <button type="button" className="point-step-button rounded-2xl border px-3 py-3 text-sm font-semibold" onClick={() => adjustTarget(-5)}>
                  <span className="inline-flex items-center gap-2"><MinusIcon className="h-4 w-4" />5</span>
                </button>
                <button type="button" className="point-step-button point-step-button-strong rounded-2xl border px-3 py-3 text-sm font-semibold" onClick={() => adjustTarget(5)}>
                  <span className="inline-flex items-center gap-2"><PlusIcon className="h-4 w-4" />5</span>
                </button>
                <button type="button" className="point-step-button point-step-button-strong rounded-2xl border px-3 py-3 text-sm font-semibold" onClick={() => adjustTarget(10)}>
                  <span className="inline-flex items-center gap-2"><PlusIcon className="h-4 w-4" />10</span>
                </button>
              </div>
            </div>
          </div>

          <div className="point-calibrator-panel rounded-[24px] border p-4 sm:p-5">
            <Field label="Exakte Zielsumme">
              <input
                className="field text-lg font-semibold"
                type="number"
                min="0"
                step="1"
                value={targetTotal}
                onChange={(e) => setTargetTotal(Number(e.target.value))}
              />
            </Field>
            <div className="mt-4">
              <p className="label">Schnellziele</p>
              <div className="flex flex-wrap gap-2">
                {quickTargets.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`point-preset-chip rounded-full border px-3 py-2 text-sm font-semibold transition ${
                      Math.round(value) === Math.round(targetTotal) ? "point-preset-chip-active" : ""
                    }`}
                    onClick={() => setTargetTotal(value)}
                  >
                    {formatNumber(value, 0)} P.
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="point-preview-grid mt-4 grid gap-3 rounded-3xl p-4 md:grid-cols-3">
        <div>
          <p className="label">Alte Punkte</p>
          <p className="themed-strong text-xl font-semibold">{formatNumber(preview.originalTotal, 0)}</p>
        </div>
        <div>
          <p className="label">Neue Punkte</p>
          <p className="themed-strong text-xl font-semibold">{formatNumber(preview.targetTotal, 0)}</p>
        </div>
        <div>
          <p className="label">Faktor</p>
          <p className="themed-strong text-xl font-semibold">{formatNumber(preview.factor, 3)}</p>
        </div>
      </div>
      <label className="point-toggle mt-4 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm sm:items-center">
        <input type="checkbox" checked={scaleAchieved} onChange={(e) => setScaleAchieved(e.target.checked)} />
        <span>Erreichte Punkte optional proportional mitskalieren</span>
      </label>
      <div className="mt-4 flex justify-stretch sm:justify-end">
        <button
          type="button"
          className="button-primary w-full gap-2 sm:w-auto"
          onClick={() => onApply(Math.max(0, Math.round(targetTotal)), scaleAchieved)}
          disabled={Math.round(targetTotal) === Math.round(currentTotal)}
        >
          <CheckIcon />
          Punkte anwenden
        </button>
      </div>
    </>
  );

  return embedded ? (
    content
  ) : (
    <Card title="Gesamtpunktzahl skalieren" subtitle="Alle Maximalpunkte werden proportional umgerechnet und als echte Daten gespeichert.">
      {content}
    </Card>
  );
};
