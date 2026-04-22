import { GradeScale, GradeScaleMode, GradeScaleRecommendedStage } from "../types";
import {
  applyNotengeneratorGradeScale,
  convertGeneratedScaleToManual,
  getEffectiveGradeBands,
  getEffectiveGradeScaleMode,
} from "../utils/gradeScaleGenerator";
import { Card, DismissibleCallout, Field, NumberInput } from "./ui";

interface Props {
  scale: GradeScale;
  totalMaxPoints: number;
  recommendedStage?: GradeScaleRecommendedStage | null;
  onChange: (nextScale: GradeScale) => void;
  onBandChange: (bandId: string, lowerBound: number, verbalLabel: string) => void;
  onTotalMaxPointsChange?: (nextTotalMaxPoints: number) => void;
}

const modeOptions: { value: GradeScaleMode; label: string }[] = [
  { value: "percentage", label: "Notengrenzen in %" },
  { value: "points", label: "Notengrenzen in Punkten" },
];

const generatorPresetOptions: Array<{
  value: GradeScaleRecommendedStage | null;
  label: string;
  hint: string;
}> = [
  { value: "sek1", label: "Sek I", hint: "setzt 50 % als Defizitschwelle für 4-" },
  { value: "sek2", label: "Sek II", hint: "setzt 45 % als Defizitschwelle für 4-" },
  { value: null, label: "Eigener Wert", hint: "behält die Defizitschwelle frei editierbar" },
] as const;

export const GradeScaleEditor = ({
  scale,
  totalMaxPoints,
  recommendedStage = null,
  onChange,
  onBandChange,
  onTotalMaxPointsChange,
}: Props) => {
  const effectiveMode = getEffectiveGradeScaleMode(scale);
  const effectiveBands = getEffectiveGradeBands(scale, totalMaxPoints);

  const applyGeneratedScale = (patch: Partial<Omit<GradeScale["generator"], "source">> = {}) => {
    const fallbackStage = scale.generator.recommendedStage ?? recommendedStage;
    const { source: _source, ...currentGenerator } = scale.generator;
    onChange(
      applyNotengeneratorGradeScale(scale, totalMaxPoints, {
        ...currentGenerator,
        ...patch,
        thresholdPercent:
          patch.thresholdPercent ?? currentGenerator.thresholdPercent ?? (fallbackStage === "sek1" ? 50 : 45),
        accumulationMode: patch.accumulationMode ?? currentGenerator.accumulationMode ?? "middle",
        useHalfPoints: patch.useHalfPoints ?? currentGenerator.useHalfPoints ?? false,
        showTendency: patch.showTendency ?? currentGenerator.showTendency ?? true,
        recommendedStage: patch.recommendedStage ?? currentGenerator.recommendedStage ?? fallbackStage,
      }),
    );
  };

  const updateManualScale = (patch: Partial<GradeScale>) => {
    onChange({
      ...scale,
      ...patch,
    });
  };

  return (
    <Card
      title="Notenschlüssel"
      subtitle="Wahlweise manuell gepflegt oder automatisch nach Defizitschwelle und Punktverteilung generiert."
    >
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <button
            type="button"
            className={`${scale.generator.source === "notengenerator" ? "button-primary" : "button-secondary"} w-full justify-start p-4 text-left`}
            onClick={() => applyGeneratedScale()}
          >
            <strong>Generierter Schlüssel</strong>
            <br />
            Dynamisch aus Gesamtpunktzahl, Defizitschwelle und Verteilmodus berechnen.
          </button>
          <button
            type="button"
            className={`${scale.generator.source === "manual" ? "button-primary" : "button-secondary"} w-full justify-start p-4 text-left`}
            onClick={() => onChange(convertGeneratedScaleToManual(scale, totalMaxPoints))}
          >
            <strong>Manueller Schlüssel</strong>
            <br />
            Grenzwerte direkt als feste Prozent- oder Punktwerte pflegen.
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Schulmodus">
            <select
              className="field"
              value={scale.schoolMode}
              onChange={(event) =>
                updateManualScale({ schoolMode: event.target.value as GradeScale["schoolMode"] })
              }
            >
              <option value="numeric">Numerische Note</option>
              <option value="verbal">Verbale Notenstufe</option>
              <option value="numericWithComment">Numerische Note + verbale Stufe</option>
            </select>
          </Field>
          <Field label="Titel">
            <input
              className="field"
              value={scale.title}
              onChange={(event) => updateManualScale({ title: event.target.value })}
            />
          </Field>
        </div>

        {scale.generator.source === "notengenerator" ? (
          <>
            <div className="grid gap-4 xl:grid-cols-3">
              <Field label="Voreinstellung">
                <select
                  className="field"
                  value={scale.generator.recommendedStage ?? "__custom__"}
                  onChange={(event) => {
                    const stageValue =
                      event.target.value === "sek1" || event.target.value === "sek2"
                        ? (event.target.value as GradeScaleRecommendedStage)
                        : null;
                    applyGeneratedScale({
                      recommendedStage: stageValue,
                      thresholdPercent: stageValue === "sek1" ? 50 : stageValue === "sek2" ? 45 : scale.generator.thresholdPercent,
                    });
                  }}
                >
                  {generatorPresetOptions.map((option) => (
                    <option key={option.value ?? "__custom__"} value={option.value ?? "__custom__"}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Defizitschwelle für 4-">
                <div className="relative">
                  <NumberInput
                    className="field"
                    value={scale.generator.thresholdPercent}
                    min={20}
                    step={1}
                    onCommit={(value) =>
                      applyGeneratedScale({
                        thresholdPercent: Math.max(20, Math.min(80, value)),
                        recommendedStage: null,
                      })
                    }
                  />
                  <span className="icon-muted pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm">
                    %
                  </span>
                </div>
              </Field>

              <Field label="Gesamtpunktzahl der Arbeit">
                {onTotalMaxPointsChange ? (
                  <NumberInput
                    className="field"
                    value={totalMaxPoints}
                    min={1}
                    step={1}
                    onCommit={(value) => onTotalMaxPointsChange(Math.max(1, Math.round(value)))}
                  />
                ) : (
                  <input className="field" value={String(totalMaxPoints)} readOnly />
                )}
              </Field>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <Field label="Überschüssige Punkte anhäufen">
                <select
                  className="field"
                  value={scale.generator.accumulationMode}
                  onChange={(event) =>
                    applyGeneratedScale({
                      accumulationMode: event.target.value as GradeScale["generator"]["accumulationMode"],
                    })
                  }
                >
                  <option value="top">oben</option>
                  <option value="middle">mittig</option>
                  <option value="bottom">unten</option>
                </select>
              </Field>

              <Field label="Punktschritte">
                <select
                  className="field"
                  value={scale.generator.useHalfPoints ? "half" : "whole"}
                  onChange={(event) =>
                    applyGeneratedScale({
                      useHalfPoints: event.target.value === "half",
                    })
                  }
                >
                  <option value="whole">ganze Punkte</option>
                  <option value="half">halbe Punkte</option>
                </select>
              </Field>

              <Field label="Notentendenzen">
                <select
                  className="field"
                  value={scale.generator.showTendency ? "show" : "hide"}
                  onChange={(event) =>
                    applyGeneratedScale({
                      showTendency: event.target.value === "show",
                    })
                  }
                >
                  <option value="show">anzeigen</option>
                  <option value="hide">ausblenden</option>
                </select>
              </Field>
            </div>

            <DismissibleCallout
              resetKey={`${scale.generator.recommendedStage}-${scale.generator.thresholdPercent}-${scale.generator.accumulationMode}-${scale.generator.useHalfPoints}-${scale.generator.showTendency}-${totalMaxPoints}`}
              tone="info"
            >
              {generatorPresetOptions.find((option) => option.value === scale.generator.recommendedStage)?.hint ??
                "Eigene Defizitschwelle aktiv."}
              {" "}Die Berechnung folgt der Notengenerator-Logik: 4- liegt auf der gewählten Defizitschwelle, 6 beginnt unterhalb der halben
              Defizitschwelle, und Restpunkte werden gemäß oben/mittig/unten verteilt.
            </DismissibleCallout>
          </>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            <Field label="Grenzwerte beziehen sich auf">
              <select
                className="field"
                value={scale.mode}
                onChange={(event) => updateManualScale({ mode: event.target.value as GradeScaleMode })}
              >
                {modeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}

        <p className="text-sm leading-6" style={{ color: "var(--app-text)" }}>
          {scale.generator.source === "notengenerator"
            ? "Der Schlüssel reagiert auf die aktuelle Gesamtpunktzahl der Arbeit. Änderungen an Abschnitts- oder Aufgabenpunkten werden dadurch automatisch mitberücksichtigt."
            : effectiveMode === "points"
              ? "Die Untergrenzen werden mit den erreichten Gesamtpunkten verglichen. Trage hier echte Punktwerte ein."
              : "Die Untergrenzen werden mit der finalen Bewertungsbasis in Prozent verglichen. Trage hier Prozentwerte ein."}
        </p>

        <div className="themed-table-shell overflow-hidden rounded-3xl border">
          <div className="overflow-x-auto">
            <table className="min-w-[640px] text-sm md:min-w-full">
              <thead className="themed-table-head text-left text-xs uppercase tracking-[0.16em]">
                <tr>
                  <th className="px-4 py-3">Note</th>
                  <th className="px-4 py-3">Verbale Stufe</th>
                  <th className="px-4 py-3">Untergrenze {effectiveMode === "points" ? "(Punkte)" : "(%)"}</th>
                </tr>
              </thead>
              <tbody className="themed-table-body">
                {(scale.generator.source === "notengenerator" ? effectiveBands : scale.bands).map((band) => (
                  <tr key={band.id} className="themed-table-row">
                    <td className="themed-strong px-4 py-3 font-semibold">{band.label}</td>
                    <td className="px-4 py-3">
                      {scale.generator.source === "notengenerator" ? (
                        <span>{band.verbalLabel}</span>
                      ) : (
                        <input
                          className="field"
                          value={band.verbalLabel}
                          onChange={(event) => onBandChange(band.id, band.lowerBound, event.target.value)}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {scale.generator.source === "notengenerator" ? (
                        <span>{String(band.lowerBound).replace(".", ",")}</span>
                      ) : (
                        <input
                          className="field max-w-40"
                          type="number"
                          step="0.5"
                          value={band.lowerBound}
                          onChange={(event) => onBandChange(band.id, Number(event.target.value), band.verbalLabel)}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Card>
  );
};
