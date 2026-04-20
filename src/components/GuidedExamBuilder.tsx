import { useEffect, useMemo, useState } from "react";
import { ExamTemplateDefinition } from "../data/templates";
import { BuilderSchoolStage, BUILDER_SUBJECT_OPTIONS, getBuilderGuidance } from "../data/builderResearch";
import { ExamMeta, GradeScale, StudentGroup } from "../types";
import { formatNumber } from "../utils/format";
import { applyNotengeneratorGradeScale } from "../utils/gradeScaleGenerator";
import { ExamHeaderForm } from "./ExamHeaderForm";
import { ExamTemplatePreviewCard } from "./ExamTemplatePreviewCard";
import { GradeScaleEditor } from "./GradeScaleEditor";
import { DashboardIcon, InfoIcon, PencilIcon, PlusIcon, ReplaceIcon, TemplateIcon } from "./icons";
import { Card, DismissibleCallout, Field, NumberInput } from "./ui";

export interface GuidedSectionDraft {
  id: string;
  title: string;
  weight: number;
  description: string;
}

export type GuidedBuilderTarget = "current" | "new";

interface Props {
  groups: Array<Pick<StudentGroup, "id" | "subject" | "className">>;
  activeGroupId: string;
  templates: ExamTemplateDefinition[];
  initialTotalPoints: number;
  initialGradeScale: GradeScale;
  initialSections: GuidedSectionDraft[];
  initialSubject?: string;
  initialMeta: ExamMeta;
  onSelectTemplate: (
    template: ExamTemplateDefinition,
    target: GuidedBuilderTarget,
    gradeScale: GradeScale,
    meta: ExamMeta,
    targetGroupId: string | null,
  ) => void;
  onApplyManualStructure: (config: {
    totalPoints: number;
    gradeScale: GradeScale;
    sections: GuidedSectionDraft[];
    target: GuidedBuilderTarget;
    meta: ExamMeta;
    targetGroupId: string | null;
  }) => void;
}

const getPartLabel = (index: number) => `Teil ${String.fromCharCode(65 + index)}`;

const buildSectionDrafts = (sections: Array<Pick<GuidedSectionDraft, "title" | "weight" | "description">>) =>
  sections.map((section) => ({
    id: crypto.randomUUID(),
    title: section.title,
    weight: section.weight,
    description: section.description,
  }));

const createFallbackSections = () =>
  buildSectionDrafts([
    { title: "Teil A", weight: 40, description: "Erster Kompetenzbereich." },
    { title: "Teil B", weight: 35, description: "Zweiter Kompetenzbereich." },
    { title: "Teil C", weight: 25, description: "Dritter Kompetenzbereich." },
  ]);

const stepLabels = (mode: "manual" | "template") =>
  mode === "manual"
    ? ["Startpunkt", "Fach", "Stufe", "Regelcheck", "Ziel", "Format", "Metadaten", "Notenschlüssel", "Aufbau", "Sektionen"]
    : ["Startpunkt", "Fach", "Stufe", "Regelcheck", "Ziel", "Format", "Metadaten", "Notenschlüssel", "Vorlage"];

const normalizeSubject = (value: string) => value.trim().toLowerCase();

export const GuidedExamBuilder = ({
  groups,
  activeGroupId,
  templates,
  initialTotalPoints,
  initialGradeScale,
  initialSections,
  initialSubject = "",
  initialMeta,
  onSelectTemplate,
  onApplyManualStructure,
}: Props) => {
  const detectedInitialSubject =
    BUILDER_SUBJECT_OPTIONS.find((option) => normalizeSubject(option) === normalizeSubject(initialSubject)) ?? null;
  const [step, setStep] = useState(0);
  const [target, setTarget] = useState<GuidedBuilderTarget>("new");
  const [targetGroupId, setTargetGroupId] = useState(activeGroupId);
  const [mode, setMode] = useState<"manual" | "template">("manual");
  const [selectedSubject, setSelectedSubject] = useState<string>(detectedInitialSubject ?? "Englisch");
  const [customSubject, setCustomSubject] = useState(detectedInitialSubject ? "" : initialSubject.trim());
  const [schoolStage, setSchoolStage] = useState<BuilderSchoolStage>("sek1");
  const [totalPoints, setTotalPoints] = useState(Math.max(1, Math.round(initialTotalPoints || 60)));
  const [gradeScale, setGradeScale] = useState<GradeScale>(() =>
    applyNotengeneratorGradeScale(
      initialGradeScale,
      Math.max(1, Math.round(initialTotalPoints || 60)),
      {
        thresholdPercent: 50,
        accumulationMode: "middle",
        useHalfPoints: false,
        showTendency: true,
        recommendedStage: "sek1",
      },
    ),
  );
  const [sectionCount, setSectionCount] = useState(Math.max(1, initialSections.length || 3));
  const [sectionDrafts, setSectionDrafts] = useState<GuidedSectionDraft[]>(
    initialSections.length > 0 ? initialSections : createFallbackSections(),
  );
  const [metaDraft, setMetaDraft] = useState<ExamMeta>(() => ({
    ...initialMeta,
  }));

  const resolvedSubject = selectedSubject === "__custom__" ? customSubject.trim() : selectedSubject;
  const guidance = useMemo(
    () => getBuilderGuidance(resolvedSubject || "Eigenes Fach", schoolStage),
    [resolvedSubject, schoolStage],
  );
  const matchingTemplates = useMemo(
    () =>
      templates.filter(
        (template) =>
          normalizeSubject(template.subject) === normalizeSubject(resolvedSubject) &&
          template.schoolStage === schoolStage,
      ),
    [resolvedSubject, schoolStage, templates],
  );
  const templatesEnabled = matchingTemplates.length > 0;
  const activeStepLabels = stepLabels(mode);

  useEffect(() => {
    const preset = guidance.preset;
    setTotalPoints(preset.totalPoints);
    setSectionCount(preset.sections.length);
    setSectionDrafts(buildSectionDrafts(preset.sections));
  }, [guidance]);

  useEffect(() => {
    setGradeScale((current) =>
      applyNotengeneratorGradeScale(
        current,
        totalPoints,
        {
          thresholdPercent: schoolStage === "sek1" ? 50 : 45,
          accumulationMode: "middle",
          useHalfPoints: false,
          showTendency: true,
          recommendedStage: schoolStage,
        },
      ),
    );
  }, [schoolStage]);

  useEffect(() => {
    if (!templatesEnabled && mode === "template") {
      setMode("manual");
      if (step > 7) setStep(7);
    }
  }, [mode, step, templatesEnabled]);

  useEffect(() => {
    setMetaDraft({ ...initialMeta });
  }, [initialMeta]);

  useEffect(() => {
    setTargetGroupId((current) => {
      if (current && groups.some((group) => group.id === current)) return current;
      if (activeGroupId && groups.some((group) => group.id === activeGroupId)) return activeGroupId;
      return groups[0]?.id ?? "";
    });
  }, [activeGroupId, groups]);

  const weightSum = useMemo(
    () => Math.round(sectionDrafts.reduce((sum, section) => sum + section.weight, 0) * 100) / 100,
    [sectionDrafts],
  );
  const difference = Math.round((100 - weightSum) * 100) / 100;
  const hasEmptyTitles = sectionDrafts.some((section) => !section.title.trim());

  const syncDraftsToCount = (count: number) => {
    setSectionDrafts((current) => {
      if (count <= current.length) return current.slice(0, count);
      const remainder = Array.from({ length: count - current.length }, (_, index) => ({
        id: crypto.randomUUID(),
        title: getPartLabel(current.length + index),
        weight: 0,
        description: "",
      }));
      return [...current, ...remainder];
    });
  };

  const applyPresetStructure = () => {
    setTotalPoints(guidance.preset.totalPoints);
    setSectionCount(guidance.preset.sections.length);
    setSectionDrafts(buildSectionDrafts(guidance.preset.sections));
  };

  const choiceButtonClass = (active: boolean) =>
    `${active ? "button-primary" : "button-secondary"} w-full justify-start p-4 text-left`;

  const goToStep = (nextStep: number) => {
    setStep((current) => {
      if (nextStep > current) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return nextStep;
    });
  };

  const renderStepBadge = (label: string, index: number) => {
    const isActive = step === index;
    const isVisible = index <= step;
    return (
      <span
        key={label}
        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
          isActive ? "button-primary" : isVisible ? "button-secondary" : "button-soft"
        }`}
      >
        {index + 1}. {label}
      </span>
    );
  };

  const subjectCards = [...BUILDER_SUBJECT_OPTIONS, "__custom__" as const];

  return (
    <Card
      title="EWH-Builder"
      subtitle="Geführter Einstieg mit Fachwahl, NRW-Regelcheck und anschließendem Aufbau im EWH-Editor."
      headerLayout="stacked"
    >
      <div className="mb-6 flex flex-wrap gap-2">
        {activeStepLabels.map((label, index) => renderStepBadge(label, index))}
      </div>

      {step === 0 && (
        <div className="space-y-6">
          <section className="builder-launch-shell">
            <div className="builder-launch-grid">
              <button type="button" className="builder-launch-orbit-button" onClick={() => goToStep(1)}>
                <div className="builder-launch-orbit" aria-hidden="true">
                  <div className="builder-launch-ring builder-launch-ring-primary" />
                  <div className="builder-launch-ring builder-launch-ring-secondary" />
                  <div className="builder-launch-ring builder-launch-ring-tertiary" />
                  <div className="builder-launch-point builder-launch-point-a" />
                  <div className="builder-launch-point builder-launch-point-b" />
                  <div className="builder-launch-point builder-launch-point-c" />
                  <div className="builder-launch-core">
                    <span className="builder-launch-core-text">EWH</span>
                  </div>
                </div>
              </button>

              <div className="builder-launch-copy">
                <p className="builder-launch-kicker">Wizard-Startpunkt</p>
                <h3 className="builder-launch-title">Erwartungshorizont mit NRW-Regelcheck vorbereiten</h3>
                <p className="builder-launch-text">
                  Der Builder startet mit Fach und Schulstufe, zieht daraus die recherchierten NRW-Regeln für Sek I
                  oder Sek II und führt dich danach Schritt für Schritt in den bestehenden Aufbau.
                </p>
                <div className="builder-launch-status" role="status" aria-live="polite">
                  <span className="builder-launch-status-dot" />
                  Stand der Quellenrecherche: 19.04.2026
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button type="button" className="button-primary" onClick={() => goToStep(1)}>
                    Startpunkt öffnen
                  </button>
                </div>
              </div>
            </div>
          </section>

          <DismissibleCallout resetKey={step}>
            Recherchierte Rechts- und Hinweislage basiert auf den offiziellen NRW-Seiten aus BASS und
            Standardsicherung. Schulinterne Fachkonferenz- und Schulkonferenzbeschlüsse bleiben zusätzlich verbindlich.
          </DismissibleCallout>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {subjectCards.map((subjectOption) => {
              const isCustom = subjectOption === "__custom__";
              const label = isCustom ? "Eigenes Fach" : subjectOption;
              const active = isCustom ? selectedSubject === "__custom__" : selectedSubject === subjectOption;
              return (
                <button
                  key={subjectOption}
                  type="button"
                  className={choiceButtonClass(active)}
                  onClick={() => setSelectedSubject(subjectOption)}
                >
                  <span className="flex items-start gap-3">
                    <span className="rounded-2xl bg-white/20 p-2.5 ring-1 ring-current/15">
                      {isCustom ? <InfoIcon className="h-5 w-5" /> : <TemplateIcon className="h-5 w-5" />}
                    </span>
                    <span>
                      <strong>{label}</strong>
                      <br />
                      {isCustom
                        ? "Allgemeine NRW-Regeln laden und den Builder fachindividuell anpassen."
                        : getBuilderGuidance(subjectOption, "sek1").stageSummary}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {selectedSubject === "__custom__" && (
            <Field label="Eigenes Fach">
              <input
                className="field"
                placeholder="z. B. Physik, Politik, Biologie"
                value={customSubject}
                onChange={(event) => setCustomSubject(event.target.value)}
              />
            </Field>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              className="button-primary w-full sm:w-auto"
              disabled={!resolvedSubject}
              onClick={() => goToStep(2)}
            >
              Weiter zu Stufenauswahl
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <button type="button" className={choiceButtonClass(schoolStage === "sek1")} onClick={() => setSchoolStage("sek1")}>
              <span className="flex items-start gap-3">
                <span className="rounded-2xl bg-white/20 p-2.5 ring-1 ring-current/15">
                  <PlusIcon className="h-5 w-5" />
                </span>
                <span>
                  <strong>Sekundarstufe I</strong>
                  <br />
                  Klassenarbeiten, Belastungsregeln, mündliche Ersatzformate und ZP10-Kontext.
                </span>
              </span>
            </button>
            <button type="button" className={choiceButtonClass(schoolStage === "sek2")} onClick={() => setSchoolStage("sek2")}>
              <span className="flex items-start gap-3">
                <span className="rounded-2xl bg-white/20 p-2.5 ring-1 ring-current/15">
                  <DashboardIcon className="h-5 w-5" />
                </span>
                <span>
                  <strong>Sekundarstufe II</strong>
                  <br />
                  EF/Q-Phase, Klausuren, Facharbeit, Kommunikationsprüfung und Abiturvorbereitung.
                </span>
              </span>
            </button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button type="button" className="button-secondary w-full sm:w-auto" onClick={() => goToStep(1)}>
              Zurück
            </button>
            <button type="button" className="button-primary w-full sm:w-auto" onClick={() => goToStep(3)}>
              Weiter zu Regelcheck
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div className="surface-muted rounded-3xl p-5">
            <p className="label">Rechercheprofil</p>
            <h3 className="themed-strong mt-2 text-xl font-semibold">
              {resolvedSubject || "Eigenes Fach"} · {guidance.label}
            </h3>
            <p className="status-note mt-3 text-sm leading-6">{guidance.stageSummary}</p>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <div className="surface-muted rounded-3xl p-5">
              <h4 className="themed-strong text-base font-semibold">Rechtlicher Rahmen</h4>
              <ul className="status-note mt-3 space-y-2 text-sm leading-6">
                {guidance.legalBullets.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
            <div className="surface-muted rounded-3xl p-5">
              <h4 className="themed-strong text-base font-semibold">Fachspezifische Hinweise</h4>
              <ul className="status-note mt-3 space-y-2 text-sm leading-6">
                {guidance.subjectBullets.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
            <div className="surface-muted rounded-3xl p-5">
              <h4 className="themed-strong text-base font-semibold">Builder-Empfehlung</h4>
              <ul className="status-note mt-3 space-y-2 text-sm leading-6">
                {guidance.planningBullets.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>

          <DismissibleCallout tone="warning" resetKey={`${resolvedSubject}-${schoolStage}`}>
            {guidance.caution}
          </DismissibleCallout>

          <div className="surface-muted rounded-3xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="themed-strong text-base font-semibold">Quellen</h4>
                <p className="status-note mt-1 text-sm">Offizielle NRW-Seiten, auf die sich dieser Wizard-Schritt stützt.</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {guidance.sources.map((source) => (
                <a
                  key={`${source.label}-${source.url}`}
                  className="button-secondary"
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {source.label}
                </a>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button type="button" className="button-secondary w-full sm:w-auto" onClick={() => goToStep(2)}>
              Zurück
            </button>
            <button type="button" className="button-primary w-full sm:w-auto" onClick={() => goToStep(4)}>
              Weiter zu Ziel
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <button type="button" className={choiceButtonClass(target === "new")} onClick={() => setTarget("new")}>
              <span className="flex items-start gap-3">
                <span className="rounded-2xl bg-white/20 p-2.5 ring-1 ring-current/15">
                  <PlusIcon className="h-5 w-5" />
                </span>
                <span>
                  <strong>Als neue Klassenarbeit anlegen</strong>
                  <br />
                  Der Builder erstellt einen neuen Workspace mit eigener Pill.
                </span>
              </span>
            </button>
            <button type="button" className={choiceButtonClass(target === "current")} onClick={() => setTarget("current")}>
              <span className="flex items-start gap-3">
                <span className="rounded-2xl bg-white/20 p-2.5 ring-1 ring-current/15">
                  <ReplaceIcon className="h-5 w-5" />
                </span>
                <span>
                  <strong>Aktuelle Klassenarbeit ersetzen</strong>
                  <br />
                  Die Struktur wird direkt in die aktuell geöffnete Klassenarbeit übernommen.
                </span>
              </span>
            </button>
          </div>

          {target === "new" && (
            groups.length > 0 ? (
              <Field label="Lerngruppe für die neue Klassenarbeit">
                <select className="field" value={targetGroupId} onChange={(event) => setTargetGroupId(event.target.value)}>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.subject} · {group.className}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <DismissibleCallout tone="warning" resetKey="guided-builder-no-groups">
                Für neue Klassenarbeiten muss zuerst eine Lerngruppe angelegt werden, damit der EWH direkt korrekt
                zugeordnet werden kann.
              </DismissibleCallout>
            )
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button type="button" className="button-secondary w-full sm:w-auto" onClick={() => goToStep(3)}>
              Zurück
            </button>
            <button
              type="button"
              className="button-primary w-full sm:w-auto"
              disabled={target === "new" && !targetGroupId}
              onClick={() => goToStep(5)}
            >
              Weiter zu Format
            </button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-6">
          {templatesEnabled ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <button type="button" className={choiceButtonClass(mode === "manual")} onClick={() => setMode("manual")}>
                <span className="flex items-start gap-3">
                  <span className="rounded-2xl bg-white/20 p-2.5 ring-1 ring-current/15">
                    <PencilIcon className="h-5 w-5" />
                  </span>
                  <span>
                    <strong>Manuell starten</strong>
                    <br />
                    Fachvorschläge anpassen, Punkteverteilung setzen und Sektionen frei ausbauen.
                  </span>
                </span>
              </button>
              <button type="button" className={choiceButtonClass(mode === "template")} onClick={() => setMode("template")}>
                <span className="flex items-start gap-3">
                  <span className="rounded-2xl bg-white/20 p-2.5 ring-1 ring-current/15">
                    <TemplateIcon className="h-5 w-5" />
                  </span>
                  <span>
                    <strong>Mit Vorlage starten</strong>
                    <br />
                    Passende Vorlagen für Fach, Stufe und in Sek II zusätzlich abiturorientierte Formate laden.
                  </span>
                </span>
              </button>
            </div>
          ) : (
            <DismissibleCallout resetKey={`${resolvedSubject}-${schoolStage}`} tone="info">
              Für {resolvedSubject || "dieses Fach"} in {guidance.label} gibt es im aktuellen Builder keine spezifische
              Vorlage. Der Wizard führt deshalb direkt in den manuellen Aufbau mit den recherchierten Fachvorschlägen.
            </DismissibleCallout>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button type="button" className="button-secondary w-full sm:w-auto" onClick={() => goToStep(4)}>
              Zurück
            </button>
            <button type="button" className="button-primary w-full sm:w-auto" onClick={() => goToStep(6)}>
              Weiter zu Metadaten
            </button>
          </div>
        </div>
      )}

      {step === 6 && (
        <div className="space-y-6">
          <div className="surface-muted rounded-3xl p-5">
            <h3 className="themed-strong text-base font-semibold">Rahmendaten der Arbeit festlegen</h3>
            <p className="status-note mt-2 text-sm leading-6">
              Titel, Datum, Kurs und Hinweise gehören in den Erstellungsfluss, damit Vorlage und anschließender
              Editor direkt mit dem richtigen Kontext starten.
            </p>
          </div>

          <ExamHeaderForm
            meta={metaDraft}
            onChange={(key, value) => {
              setMetaDraft((current) => ({
                ...current,
                [key]: value,
              }));
            }}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button type="button" className="button-secondary w-full sm:w-auto" onClick={() => goToStep(5)}>
              Zurück
            </button>
            <button type="button" className="button-primary w-full sm:w-auto" onClick={() => goToStep(7)}>
              Weiter zu Notenschlüssel
            </button>
          </div>
        </div>
      )}

      {step === 7 && (
        <div className="space-y-6">
          <GradeScaleEditor
            scale={gradeScale}
            totalMaxPoints={totalPoints}
            recommendedStage={schoolStage}
            onChange={setGradeScale}
            onBandChange={(bandId, lowerBound, verbalLabel) =>
              setGradeScale((current) => ({
                ...current,
                bands: current.bands.map((band) =>
                  band.id === bandId ? { ...band, lowerBound, verbalLabel } : band,
                ),
              }))
            }
          />

          <DismissibleCallout resetKey={`${resolvedSubject}-${schoolStage}-${mode}`}>
            Der Notenschlüssel wird hier früh festgelegt, damit der anschließende Aufbau direkt zur gewählten
            Prüfungslogik passt.
          </DismissibleCallout>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button type="button" className="button-secondary w-full sm:w-auto" onClick={() => goToStep(6)}>
              Zurück
            </button>
            <button type="button" className="button-primary w-full sm:w-auto" onClick={() => goToStep(8)}>
              {mode === "template" ? "Weiter zu Vorlagen" : "Weiter zu Aufbau"}
            </button>
          </div>
        </div>
      )}

      {mode === "template" && step === 8 && (
        <div className="space-y-4">
          <DismissibleCallout resetKey={`template-${resolvedSubject}-${schoolStage}`}>
            {matchingTemplates.length} Vorlage{matchingTemplates.length === 1 ? "" : "n"} für {resolvedSubject || "dieses Fach"} in {guidance.label}
            {" "}stehen bereit. In Sek II werden zusätzlich abiturorientierte Varianten mit angezeigt; der gewählte
            Notenschlüssel wird beim Laden direkt übernommen.
          </DismissibleCallout>
          <div className="grid gap-4 xl:grid-cols-3">
            {matchingTemplates.map((template) => (
              <ExamTemplatePreviewCard
                key={template.id}
                template={template}
                onLoad={() =>
                  onSelectTemplate(
                    template,
                    target,
                    gradeScale,
                    metaDraft,
                    target === "new" ? targetGroupId || null : null,
                  )
                }
              />
            ))}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button type="button" className="button-secondary w-full sm:w-auto" onClick={() => goToStep(7)}>
              Zurück
            </button>
          </div>
        </div>
      )}

      {mode === "manual" && step === 8 && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Gesamtpunktzahl">
              <div className="relative">
                <span className="icon-muted pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                  <DashboardIcon className="h-4 w-4" />
                </span>
                <NumberInput
                  className="field !pl-10"
                  value={totalPoints}
                  min={1}
                  onCommit={(value) => setTotalPoints(Math.max(1, value))}
                />
              </div>
            </Field>
            <Field label="Anzahl Sektionen">
              <div className="relative">
                <span className="icon-muted pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                  <TemplateIcon className="h-4 w-4" />
                </span>
                <NumberInput
                  className="field !pl-10"
                  value={sectionCount}
                  min={1}
                  onCommit={(value) => {
                    const nextCount = Math.max(1, Math.round(value));
                    setSectionCount(nextCount);
                    syncDraftsToCount(nextCount);
                  }}
                />
              </div>
            </Field>
          </div>

          <div className="surface-muted rounded-3xl p-5">
            <h4 className="themed-strong text-base font-semibold">Builder-Grundlage</h4>
            <p className="status-note mt-2 text-sm leading-6">
              {resolvedSubject || "Eigenes Fach"} · {guidance.label} · {formatNumber(guidance.preset.totalPoints)} Punkte
            </p>
            <p className="status-note mt-3 text-sm leading-6">
              Die hier vorbelegte Grundstruktur wird aus Fach und Stufe abgeleitet und kann im nächsten Schritt
              vollständig überschrieben oder verfeinert werden.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {guidance.preset.sections.map((section, index) => (
                <span key={`${section.title}-${index}`} className="button-soft">
                  {section.title} · {formatNumber(section.weight)} %
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button type="button" className="button-secondary w-full sm:w-auto" onClick={() => goToStep(7)}>
              Zurück
            </button>
            <button type="button" className="button-primary w-full sm:w-auto" onClick={() => goToStep(9)}>
              Weiter zu Sektionen
            </button>
          </div>
        </div>
      )}

      {mode === "manual" && step === 9 && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="status-note text-sm leading-6">
              Summe der Gewichtungen: <strong>{formatNumber(weightSum)}</strong> / 100 %
            </p>
            {difference !== 0 && (
              <p className="warning-note text-xs">
                Noch {difference > 0 ? formatNumber(difference) : formatNumber(Math.abs(difference))} %{" "}
                {difference > 0 ? "zu verteilen" : "zu viel vergeben"}.
              </p>
            )}
          </div>

          <div className="space-y-4">
            {sectionDrafts.map((section, index) => (
              <div key={section.id} className="surface-muted rounded-3xl p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="themed-strong text-sm font-semibold">{getPartLabel(index)}</p>
                  <span className="label">{formatNumber((totalPoints * section.weight) / 100)} Punkte</span>
                </div>
                <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_140px]">
                  <Field label="Titel">
                    <input
                      className="field"
                      value={section.title}
                      onChange={(event) =>
                        setSectionDrafts((current) =>
                          current.map((entry) =>
                            entry.id === section.id ? { ...entry, title: event.target.value } : entry,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="Gewichtung in %">
                    <NumberInput
                      className="field"
                      value={section.weight}
                      min={0}
                      onCommit={(value) =>
                        setSectionDrafts((current) =>
                          current.map((entry) => (entry.id === section.id ? { ...entry, weight: value } : entry)),
                        )
                      }
                    />
                  </Field>
                </div>
                <p className="status-note mt-3 text-xs leading-5">
                  Maximaler Anteil: {formatNumber(section.weight)} % von {formatNumber(totalPoints)} Punkten ={" "}
                  {formatNumber((totalPoints * section.weight) / 100)} Punkte.
                </p>
                <Field label="Beschreibung">
                  <textarea
                    className="field mt-3 min-h-24"
                    value={section.description}
                    onChange={(event) =>
                      setSectionDrafts((current) =>
                        current.map((entry) =>
                          entry.id === section.id ? { ...entry, description: event.target.value } : entry,
                        ),
                      )
                    }
                  />
                </Field>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-between gap-3">
            <button type="button" className="button-secondary" onClick={() => goToStep(8)}>
              Zurück
            </button>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="button-secondary" onClick={applyPresetStructure}>
                Standardstruktur zurücksetzen
              </button>
              <button
                type="button"
                className="button-primary"
                disabled={(target === "new" && !targetGroupId) || difference !== 0 || hasEmptyTitles}
                onClick={() =>
                  onApplyManualStructure({
                    totalPoints,
                    gradeScale,
                    sections: sectionDrafts,
                    target,
                    meta: metaDraft,
                    targetGroupId: target === "new" ? targetGroupId || null : null,
                  })
                }
              >
                In EWH-Editor übernehmen
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
