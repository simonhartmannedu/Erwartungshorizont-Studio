import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { ExamTemplateDefinition } from "../data/templates";
import { BuilderSchoolStage, BUILDER_SUBJECT_OPTIONS, getBuilderGuidance } from "../data/builderResearch";
import { Exam, ExamMeta, GradeScale, Section, StudentGroup, Task } from "../types";
import { formatNumber } from "../utils/format";
import { applyNotengeneratorGradeScale } from "../utils/gradeScaleGenerator";
import { ExamHeaderForm } from "./ExamHeaderForm";
import {
  DashboardIcon,
  InfoIcon,
  PencilIcon,
  PlusIcon,
  ReplaceIcon,
  TemplateIcon,
  UploadIcon,
} from "./icons";
import { ImportedExamSuggestion } from "../pdf/types";
import { PdfImportAssistant } from "./PdfImportAssistant";
import { Card, DismissibleCallout, Field, NumberInput, TextAreaField } from "./ui";

export interface GuidedSectionDraft {
  id: string;
  title: string;
  weight: number;
  description: string;
}

export type GuidedBuilderTarget = "current" | "new";

type DecisionMode = "templates" | "pdf" | "manual";
type StageFilter = BuilderSchoolStage | "all";
type FocusFilter = ExamTemplateDefinition["focus"] | "all";
type SubjectThemeKey = "deutsch" | "englisch" | "mathematik" | "geschichte" | "chemie" | "informatik" | "default";
type SubjectIconName = "book" | "speech" | "calculator" | "history" | "flask" | "code" | "template";

interface SubjectTheme {
  key: SubjectThemeKey;
  icon: SubjectIconName;
  pastel: string;
  accent: string;
}

interface WeightedItem<T> {
  value: T;
  basePoints: number;
}

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
    targetTotalPoints: number,
  ) => void;
  onApplyManualStructure: (config: {
    totalPoints: number;
    gradeScale: GradeScale;
    sections: GuidedSectionDraft[];
    target: GuidedBuilderTarget;
    meta: ExamMeta;
    targetGroupId: string | null;
  }) => void;
  onApplyPdfSuggestion: (config: {
    suggestion: ImportedExamSuggestion;
    target: GuidedBuilderTarget;
    gradeScale: GradeScale;
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

const normalizeText = (value: string) => value.trim().toLowerCase();
const POINT_STEP = 0.5;

const stageLabel = (stage: BuilderSchoolStage) => (stage === "sek1" ? "Sek I" : "Sek II");

const focusLabel = (focus: ExamTemplateDefinition["focus"]) => (focus === "abitur" ? "Abitur" : "Standard");

const stageLongLabel = (stage: BuilderSchoolStage) => (stage === "sek1" ? "Sekundarstufe I" : "Sekundarstufe II");

const SUBJECT_THEMES: Record<SubjectThemeKey, SubjectTheme> = {
  deutsch: {
    key: "deutsch",
    icon: "book",
    pastel: "#FADADD",
    accent: "#C75C6A",
  },
  englisch: {
    key: "englisch",
    icon: "speech",
    pastel: "#D9EAFE",
    accent: "#3B73C8",
  },
  mathematik: {
    key: "mathematik",
    icon: "calculator",
    pastel: "#DEE7FF",
    accent: "#4F63C6",
  },
  geschichte: {
    key: "geschichte",
    icon: "history",
    pastel: "#FCE8B2",
    accent: "#B7791F",
  },
  chemie: {
    key: "chemie",
    icon: "flask",
    pastel: "#D7F3E3",
    accent: "#2F8F62",
  },
  informatik: {
    key: "informatik",
    icon: "code",
    pastel: "#E8DDFB",
    accent: "#7657C8",
  },
  default: {
    key: "default",
    icon: "template",
    pastel: "#E5E7EB",
    accent: "#64748B",
  },
};

const getSubjectTheme = (subject: string) => {
  const normalized = normalizeText(subject);
  if (normalized.includes("deutsch")) return SUBJECT_THEMES.deutsch;
  if (normalized.includes("englisch") || normalized.includes("english")) return SUBJECT_THEMES.englisch;
  if (normalized.includes("mathematik") || normalized.includes("math")) return SUBJECT_THEMES.mathematik;
  if (normalized.includes("geschichte") || normalized.includes("history")) return SUBJECT_THEMES.geschichte;
  if (normalized.includes("chemie") || normalized.includes("science")) return SUBJECT_THEMES.chemie;
  if (normalized.includes("informatik") || normalized.includes("computer")) return SUBJECT_THEMES.informatik;
  return SUBJECT_THEMES.default;
};

const getSubjectThemeStyle = (theme: SubjectTheme) => ({
  "--template-subject-pastel": theme.pastel,
  "--template-subject-accent": theme.accent,
} as CSSProperties);

const sumPoints = (points: number[]) => Math.round(points.reduce((sum, point) => sum + point, 0) * 100) / 100;

const snapPoint = (value: number) => Math.max(POINT_STEP, Math.round(value / POINT_STEP) * POINT_STEP);

const getTemplateDefaultSectionPoints = (template: ExamTemplateDefinition) =>
  template.previewSections.map((section) => snapPoint(section.points));

const largestRemainderAllocation = <T,>(
  items: WeightedItem<T>[],
  targetTotal: number,
): Array<{ value: T; allocated: number }> => {
  const safeUnits = Math.max(0, Math.round(targetTotal / POINT_STEP));
  const baseTotal = items.reduce((sum, item) => sum + item.basePoints, 0);

  if (items.length === 0) return [];
  if (baseTotal <= 0) {
    const evenBase = Math.floor(safeUnits / items.length);
    let remainder = safeUnits - evenBase * items.length;
    return items.map((item) => {
      const allocated = evenBase + (remainder > 0 ? 1 : 0);
      remainder = Math.max(0, remainder - 1);
      return { value: item.value, allocated: Math.max(POINT_STEP, allocated * POINT_STEP) };
    });
  }

  const scaled = items.map((item) => {
    const exact = (item.basePoints / baseTotal) * safeUnits;
    const floor = Math.floor(exact);
    return { item: item.value, floor, remainder: exact - floor };
  });
  let remaining = safeUnits - scaled.reduce((sum, item) => sum + item.floor, 0);
  scaled
    .sort((a, b) => b.remainder - a.remainder)
    .forEach((entry) => {
      if (remaining <= 0) return;
      entry.floor += 1;
      remaining -= 1;
    });

  return scaled.map((entry) => ({ value: entry.item, allocated: Math.max(POINT_STEP, entry.floor * POINT_STEP) }));
};

const redistributePoints = (points: number[], targetTotal: number) =>
  largestRemainderAllocation(
    points.map((point, index) => ({ value: index, basePoints: point })),
    targetTotal,
  )
    .sort((a, b) => a.value - b.value)
    .map((entry) => entry.allocated);

const adjustTasksToSectionPoints = (tasks: Task[], targetPoints: number) =>
  largestRemainderAllocation(
    tasks.map((task) => ({ value: task, basePoints: task.maxPoints })),
    targetPoints,
  ).map(({ value: task, allocated }) => ({
    ...task,
    maxPoints: allocated,
    achievedPoints: Math.min(task.achievedPoints, allocated),
  }));

const adjustExamToSectionPoints = (exam: Exam, sectionPoints: number[]): Exam => {
  const total = sumPoints(sectionPoints);
  const sections: Section[] = exam.sections.map((section, index) => {
    const sectionTarget = sectionPoints[index] ?? section.tasks.reduce((sum, task) => sum + task.maxPoints, 0);
    return {
      ...section,
      weight: total > 0 ? Math.round((sectionTarget / total) * 10000) / 100 : section.weight,
      maxPointsOverride: null,
      tasks: adjustTasksToSectionPoints(section.tasks, sectionTarget),
    };
  });

  return {
    ...exam,
    sections,
  };
};

const createAdjustedTemplate = (template: ExamTemplateDefinition, sectionPoints: number[]): ExamTemplateDefinition => ({
  ...template,
  totalPoints: sumPoints(sectionPoints),
  previewSections: template.previewSections.map((section, index) => ({
    ...section,
    points: sectionPoints[index] ?? section.points,
  })),
  build: () => adjustExamToSectionPoints(template.build(), sectionPoints),
});

const SubjectThemeIcon = ({ icon }: { icon: SubjectIconName }) => {
  const iconClass = "h-5 w-5";

  switch (icon) {
    case "book":
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M5.5 5.5h6A2.5 2.5 0 0 1 14 8v11a2.5 2.5 0 0 0-2.5-2.5h-6Z" strokeLinejoin="round" />
          <path d="M18.5 5.5h-4A2.5 2.5 0 0 0 12 8v11a2.5 2.5 0 0 1 2.5-2.5h4Z" strokeLinejoin="round" />
          <path d="M8 9h2.5M8 12h2.5M15 9h1.5" strokeLinecap="round" />
        </svg>
      );
    case "speech":
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M5 6.5h14v8.5H9l-4 3.5Z" strokeLinejoin="round" />
          <path d="M8.5 10h7M8.5 13h4" strokeLinecap="round" />
        </svg>
      );
    case "calculator":
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <rect x="6" y="4" width="12" height="16" rx="2" />
          <path d="M8.5 7h7M9 11h.1M12 11h.1M15 11h.1M9 14h.1M12 14h.1M15 14h.1M9 17h3.1M15 17h.1" strokeLinecap="round" />
        </svg>
      );
    case "history":
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M4.5 10.5 12 6l7.5 4.5Z" strokeLinejoin="round" />
          <path d="M6.5 10.5v6M10 10.5v6M14 10.5v6M17.5 10.5v6M5 18.5h14" strokeLinecap="round" />
        </svg>
      );
    case "flask":
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M9 4.5h6M10 4.5v5.2l-4.4 7.2A2 2 0 0 0 7.3 20h9.4a2 2 0 0 0 1.7-3.1L14 9.7V4.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8.2 15h7.6M10 18h4" strokeLinecap="round" />
        </svg>
      );
    case "code":
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="m9 8-4 4 4 4M15 8l4 4-4 4M13 6.5 11 17.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "template":
    default:
      return <TemplateIcon className={iconClass} />;
  }
};

const gradeScaleFor = (current: GradeScale, totalPoints: number, stage: BuilderSchoolStage) =>
  applyNotengeneratorGradeScale(current, Math.max(1, Math.round(totalPoints * 2) / 2), {
    thresholdPercent: stage === "sek1" ? 50 : 45,
    accumulationMode: "middle",
    useHalfPoints: false,
    showTendency: true,
    recommendedStage: stage,
  });

const getTemplateSearchText = (template: ExamTemplateDefinition) =>
  [
    template.title,
    template.shortLabel,
    template.subject,
    stageLabel(template.schoolStage),
    stageLongLabel(template.schoolStage),
    focusLabel(template.focus),
    `${template.totalPoints} Punkte`,
    template.description,
    template.pedagogicalHint,
    ...template.previewSections.flatMap((section) => [section.title, `${section.points} Punkte`, ...section.tasks]),
  ]
    .join(" ")
    .toLowerCase();

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
  onApplyPdfSuggestion,
}: Props) => {
  const metaEditorRef = useRef<HTMLElement | null>(null);
  const detectedInitialSubject =
    BUILDER_SUBJECT_OPTIONS.find((option) => normalizeText(option) === normalizeText(initialSubject)) ?? null;
  const initialTemplateId =
    templates.find((template) => normalizeText(template.subject) === normalizeText(initialSubject))?.id ??
    templates[0]?.id ??
    null;

  const [mode, setMode] = useState<DecisionMode>("templates");
  const [query, setQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<StageFilter>("all");
  const [focusFilter, setFocusFilter] = useState<FocusFilter>("all");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(initialTemplateId);
  const [templatePointDrafts, setTemplatePointDrafts] = useState<Record<string, number[]>>({});
  const [target, setTarget] = useState<GuidedBuilderTarget>("new");
  const [targetGroupId, setTargetGroupId] = useState(activeGroupId);
  const [showMetaSettings, setShowMetaSettings] = useState(false);
  const [manualSubject, setManualSubject] = useState<string>(detectedInitialSubject ?? "Englisch");
  const [manualCustomSubject, setManualCustomSubject] = useState(detectedInitialSubject ? "" : initialSubject.trim());
  const [manualStage, setManualStage] = useState<BuilderSchoolStage>("sek1");
  const [totalPoints, setTotalPoints] = useState(Math.max(1, Math.round(initialTotalPoints || 60)));
  const [gradeScale, setGradeScale] = useState<GradeScale>(() =>
    gradeScaleFor(initialGradeScale, Math.max(1, Math.round(initialTotalPoints || 60)), "sek1"),
  );
  const [sectionDrafts, setSectionDrafts] = useState<GuidedSectionDraft[]>(
    initialSections.length > 0 ? initialSections : createFallbackSections(),
  );
  const [metaDraft, setMetaDraft] = useState<ExamMeta>(() => ({ ...initialMeta }));

  const availableSubjects = useMemo(
    () =>
      Array.from(new Set([...BUILDER_SUBJECT_OPTIONS, ...templates.map((template) => template.subject)])).sort((a, b) =>
        a.localeCompare(b, "de"),
      ),
    [templates],
  );

  const scoredTemplates = useMemo(() => {
    const normalizedQuery = normalizeText(query);
    const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);

    return templates
      .map((template, index) => {
        const searchText = getTemplateSearchText(template);
        const titleText = `${template.title} ${template.shortLabel}`.toLowerCase();
        const previewText = template.previewSections
          .flatMap((section) => [section.title, ...section.tasks])
          .join(" ")
          .toLowerCase();
        const queryMatches = queryTokens.every((token) => searchText.includes(token));
        const subjectMatches = subjectFilter === "all" || template.subject === subjectFilter;
        const stageMatches = stageFilter === "all" || template.schoolStage === stageFilter;
        const focusMatches = focusFilter === "all" || template.focus === focusFilter;
        const initialSubjectBonus = normalizeText(template.subject) === normalizeText(initialSubject) ? 8 : 0;
        const score =
          queryTokens.reduce((sum, token) => {
            if (titleText.includes(token)) return sum + 12;
            if (normalizeText(template.subject).includes(token)) return sum + 9;
            if (previewText.includes(token)) return sum + 6;
            if (searchText.includes(token)) return sum + 3;
            return sum;
          }, 0) +
          initialSubjectBonus +
          (template.focus === "abitur" ? 1 : 0);

        return {
          template,
          index,
          visible: queryMatches && subjectMatches && stageMatches && focusMatches,
          score,
        };
      })
      .filter((entry) => entry.visible)
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .map((entry) => entry.template);
  }, [focusFilter, initialSubject, query, stageFilter, subjectFilter, templates]);

  const selectedTemplate = useMemo(
    () => scoredTemplates.find((template) => template.id === selectedTemplateId) ?? scoredTemplates[0] ?? null,
    [scoredTemplates, selectedTemplateId],
  );
  const selectedTemplatePoints = useMemo(() => {
    if (!selectedTemplate) return [];
    const draft = templatePointDrafts[selectedTemplate.id];
    if (draft?.length === selectedTemplate.previewSections.length) return draft;
    return getTemplateDefaultSectionPoints(selectedTemplate);
  }, [selectedTemplate, templatePointDrafts]);
  const selectedTemplateTotalPoints = selectedTemplate ? sumPoints(selectedTemplatePoints) : 0;
  const adjustedSelectedTemplate = useMemo(
    () => (selectedTemplate ? createAdjustedTemplate(selectedTemplate, selectedTemplatePoints) : null),
    [selectedTemplate, selectedTemplatePoints],
  );

  const manualResolvedSubject = manualSubject === "__custom__" ? manualCustomSubject.trim() : manualSubject;
  const manualGuidance = useMemo(
    () => getBuilderGuidance(manualResolvedSubject || "Eigenes Fach", manualStage),
    [manualResolvedSubject, manualStage],
  );
  const activeScaleStage = selectedTemplate?.schoolStage ?? manualStage;
  const weightSum = useMemo(
    () => Math.round(sectionDrafts.reduce((sum, section) => sum + section.weight, 0) * 100) / 100,
    [sectionDrafts],
  );
  const difference = Math.round((100 - weightSum) * 100) / 100;
  const hasEmptyTitles = sectionDrafts.some((section) => !section.title.trim());
  const canCreate = target === "current" || Boolean(targetGroupId);

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

  useEffect(() => {
    if (scoredTemplates.length === 0) {
      setSelectedTemplateId(null);
      return;
    }

    if (!selectedTemplateId || !scoredTemplates.some((template) => template.id === selectedTemplateId)) {
      setSelectedTemplateId(scoredTemplates[0].id);
    }
  }, [scoredTemplates, selectedTemplateId]);

  useEffect(() => {
    if (mode !== "templates" || !selectedTemplate) return;
    setTotalPoints(selectedTemplateTotalPoints);
    setGradeScale((current) => gradeScaleFor(current, selectedTemplateTotalPoints, selectedTemplate.schoolStage));
  }, [mode, selectedTemplate?.id, selectedTemplateTotalPoints]);

  useEffect(() => {
    if (mode !== "manual") return;
    setTotalPoints(manualGuidance.preset.totalPoints);
    setSectionDrafts(buildSectionDrafts(manualGuidance.preset.sections));
    setGradeScale((current) => gradeScaleFor(current, manualGuidance.preset.totalPoints, manualStage));
  }, [manualGuidance, manualStage, mode]);

  const updateTotalPoints = (value: number) => {
    const nextTotal = Math.max(1, Math.round(value * 2) / 2);
    if (mode === "templates" && selectedTemplate) {
      const nextPoints = redistributePoints(selectedTemplatePoints, nextTotal);
      setTemplatePointDrafts((current) => ({
        ...current,
        [selectedTemplate.id]: nextPoints,
      }));
    }
    setTotalPoints(nextTotal);
    setGradeScale((current) => gradeScaleFor(current, nextTotal, activeScaleStage));
  };

  const selectTemplate = (template: ExamTemplateDefinition) => {
    const nextPoints = templatePointDrafts[template.id] ?? getTemplateDefaultSectionPoints(template);
    setSelectedTemplateId(template.id);
    setTotalPoints(sumPoints(nextPoints));
    setGradeScale((current) => gradeScaleFor(current, sumPoints(nextPoints), template.schoolStage));
  };

  const updateTemplateSectionPoint = (sectionIndex: number, value: number) => {
    if (!selectedTemplate) return;

    const currentPoints = selectedTemplatePoints.length
      ? selectedTemplatePoints
      : getTemplateDefaultSectionPoints(selectedTemplate);
    const nextPoints = currentPoints.map((point, index) => (index === sectionIndex ? snapPoint(value) : point));
    const nextTotal = sumPoints(nextPoints);

    setTemplatePointDrafts((current) => ({
      ...current,
      [selectedTemplate.id]: nextPoints,
    }));
    setTotalPoints(nextTotal);
    setGradeScale((current) => gradeScaleFor(current, nextTotal, selectedTemplate.schoolStage));
  };

  const resetFilters = () => {
    setQuery("");
    setSubjectFilter("all");
    setStageFilter("all");
    setFocusFilter("all");
  };

  const applyManualPreset = () => {
    setTotalPoints(manualGuidance.preset.totalPoints);
    setSectionDrafts(buildSectionDrafts(manualGuidance.preset.sections));
    setGradeScale((current) => gradeScaleFor(current, manualGuidance.preset.totalPoints, manualStage));
  };

  const openMetaSettings = () => {
    setShowMetaSettings(true);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        metaEditorRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    });
  };

  const renderModeButton = (nextMode: DecisionMode, label: string, description: string) => {
    const active = mode === nextMode;
    const Icon = nextMode === "templates" ? TemplateIcon : nextMode === "pdf" ? UploadIcon : PencilIcon;
    return (
      <button
        type="button"
        className={`template-mode-button ${active ? "template-mode-button-active" : ""}`}
        onClick={() => setMode(nextMode)}
        aria-pressed={active}
      >
        <Icon className="h-5 w-5" />
        <span>
          <strong>{label}</strong>
          <small>{description}</small>
        </span>
      </button>
    );
  };

  const renderTargetControls = () => (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          className={`${target === "new" ? "button-primary" : "button-secondary"} w-full justify-start gap-2 p-3 text-left`}
          onClick={() => setTarget("new")}
        >
          <PlusIcon />
          Neue Klassenarbeit
        </button>
        <button
          type="button"
          className={`${target === "current" ? "button-primary" : "button-secondary"} w-full justify-start gap-2 p-3 text-left`}
          onClick={() => setTarget("current")}
        >
          <ReplaceIcon />
          Aktuelle ersetzen
        </button>
      </div>
      {target === "new" &&
        (groups.length > 0 ? (
          <Field label="Lerngruppe">
            <select className="field" value={targetGroupId} onChange={(event) => setTargetGroupId(event.target.value)}>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.subject} · {group.className}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <DismissibleCallout tone="warning" resetKey="template-decision-no-groups">
            Für neue Klassenarbeiten muss zuerst eine Lerngruppe angelegt werden.
          </DismissibleCallout>
        ))}
    </div>
  );

  const renderMetaSummary = () => (
    <div className="template-meta-summary">
      <div>
        <span>Titel</span>
        <strong>{metaDraft.title.trim() || "Ohne Titel"}</strong>
      </div>
      <div>
        <span>Kurs</span>
        <strong>{metaDraft.course.trim() || "-"}</strong>
      </div>
      <div>
        <span>Datum</span>
        <strong>{metaDraft.examDate || "-"}</strong>
      </div>
      <button
        type="button"
        className="button-secondary w-full"
        onClick={() => {
          if (showMetaSettings) {
            setShowMetaSettings(false);
            return;
          }
          openMetaSettings();
        }}
      >
        {showMetaSettings ? "Rahmendaten ausblenden" : "Rahmendaten bearbeiten"}
      </button>
    </div>
  );

  const renderMetaEditor = () =>
    showMetaSettings ? (
      <section ref={metaEditorRef} className="template-meta-editor">
        <div className="template-meta-editor-header">
          <div>
            <p className="label">Rahmendaten</p>
            <h3 className="themed-strong text-lg font-semibold">Klassenarbeit vor dem Öffnen beschriften</h3>
            <p className="themed-muted mt-1 text-sm leading-6">
              Diese Angaben werden direkt in den neuen Erwartungshorizont übernommen.
            </p>
          </div>
          <button type="button" className="button-soft px-3 py-2 text-xs" onClick={() => setShowMetaSettings(false)}>
            Schließen
          </button>
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
      </section>
    ) : null;

  const renderTemplateCard = (template: ExamTemplateDefinition, index: number) => {
    const selected = selectedTemplate?.id === template.id;
    const subjectTheme = getSubjectTheme(template.subject);
    return (
      <button
        key={template.id}
        type="button"
        className={`template-result-card ${selected ? "template-result-card-selected" : ""}`}
        style={getSubjectThemeStyle(subjectTheme)}
        onClick={() => selectTemplate(template)}
        aria-pressed={selected}
      >
        <span className="template-subject-mark" aria-hidden="true">
          <SubjectThemeIcon icon={subjectTheme.icon} />
        </span>
        <span className="flex flex-wrap gap-2">
          {index === 0 && <span className="template-badge template-badge-strong">Beste Auswahl</span>}
          <span className="template-badge template-subject-badge">{template.subject}</span>
          <span className="template-badge">{stageLabel(template.schoolStage)}</span>
          <span className="template-badge">{focusLabel(template.focus)}</span>
          <span className="template-badge">{formatNumber(template.totalPoints)} P.</span>
        </span>
        <span className="block">
          <span className="template-result-title">{template.title}</span>
          <span className="template-result-copy">{template.description}</span>
        </span>
        <span className="template-result-sections">
          {template.previewSections.slice(0, 3).map((section) => (
            <span key={section.title}>
              <strong>{section.title}</strong>
              <small>{section.points} P.</small>
            </span>
          ))}
        </span>
      </button>
    );
  };

  return (
    <Card className="template-decision-shell">
      <div className="template-decision-header">
        <div>
          <p className="label">Schnellentscheidung</p>
          <h2 className="themed-strong mt-2 text-2xl font-semibold">Vorlage finden, prüfen, öffnen</h2>
          <p className="themed-muted mt-2 max-w-3xl text-sm leading-6">
            Suche direkt nach Fach, Stufe, Punkteumfang oder Prüfungsformat. Die passende Struktur landet sofort im
            EWH-Editor und kann dort weiter angepasst werden.
          </p>
        </div>
        <div className="template-decision-count">
          <strong>{templates.length}</strong>
          <span>Vorlagen</span>
        </div>
      </div>

      <div className="template-mode-tabs">
        {renderModeButton("templates", "Vorlagen", "Suchen und übernehmen")}
        {renderModeButton("pdf", "PDF", "Aus Material starten")}
        {renderModeButton("manual", "Leere Struktur", "Kurz selbst aufbauen")}
      </div>

      {mode === "templates" && (
        <div className="template-decision-layout">
          <section className="template-search-panel">
            <div className="template-search-box">
              <TemplateIcon className="h-5 w-5" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Fach, Kompetenz, Punkte oder Format suchen..."
                aria-label="Vorlagen durchsuchen"
              />
              {(query || subjectFilter !== "all" || stageFilter !== "all" || focusFilter !== "all") && (
                <button type="button" onClick={resetFilters}>
                  Zurücksetzen
                </button>
              )}
            </div>

            <div className="template-filter-row" aria-label="Fachfilter">
              <button
                type="button"
                className={`template-filter-chip ${subjectFilter === "all" ? "template-filter-chip-active" : ""}`}
                onClick={() => setSubjectFilter("all")}
              >
                Alle Fächer
              </button>
              {availableSubjects.map((subject) => (
                <button
                  key={subject}
                  type="button"
                  className={`template-filter-chip ${subjectFilter === subject ? "template-filter-chip-active" : ""}`}
                  onClick={() => setSubjectFilter(subject)}
                >
                  {subject}
                </button>
              ))}
            </div>

            <div className="template-filter-row" aria-label="Stufen und Formatfilter">
              {[
                ["all", "Alle Stufen"],
                ["sek1", "Sek I"],
                ["sek2", "Sek II"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`template-filter-chip ${stageFilter === value ? "template-filter-chip-active" : ""}`}
                  onClick={() => setStageFilter(value as StageFilter)}
                >
                  {label}
                </button>
              ))}
              {[
                ["all", "Alle Formate"],
                ["general", "Standard"],
                ["abitur", "Abitur"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`template-filter-chip ${focusFilter === value ? "template-filter-chip-active" : ""}`}
                  onClick={() => setFocusFilter(value as FocusFilter)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="themed-muted text-sm">
                {scoredTemplates.length} Treffer{query ? ` für "${query}"` : ""}
              </p>
            </div>

            {scoredTemplates.length > 0 ? (
              <div className="template-result-grid">
                {scoredTemplates.map((template, index) => renderTemplateCard(template, index))}
              </div>
            ) : (
              <div className="template-empty-state">
                <InfoIcon className="h-6 w-6" />
                <div>
                  <h3 className="themed-strong text-base font-semibold">Keine passende Vorlage gefunden</h3>
                  <p className="themed-muted mt-1 text-sm leading-6">
                    Suche breiter oder starte mit PDF-Import beziehungsweise einer leeren Struktur.
                  </p>
                </div>
              </div>
            )}
          </section>

          <aside className="template-preview-panel">
            {selectedTemplate ? (
              <div
                className="template-preview-subject-wrap"
                style={getSubjectThemeStyle(getSubjectTheme(selectedTemplate.subject))}
              >
                <div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <span className="template-subject-mark template-subject-mark-large" aria-hidden="true">
                      <SubjectThemeIcon icon={getSubjectTheme(selectedTemplate.subject).icon} />
                    </span>
                    <span className="template-badge template-badge-strong template-subject-badge">
                      {selectedTemplate.subject}
                    </span>
                    <span className="template-badge">{stageLongLabel(selectedTemplate.schoolStage)}</span>
                    <span className="template-badge">{focusLabel(selectedTemplate.focus)}</span>
                  </div>
                  <h3 className="themed-strong text-xl font-semibold">{selectedTemplate.title}</h3>
                  <p className="themed-muted mt-2 text-sm leading-6">{selectedTemplate.pedagogicalHint}</p>
                </div>

                <div className="template-section-list">
                  {selectedTemplate.previewSections.map((section, index) => {
                    const sectionPointValue = selectedTemplatePoints[index] ?? section.points;
                    const sliderMax = Math.max(
                      selectedTemplate.totalPoints * 1.5,
                      selectedTemplateTotalPoints,
                      sectionPointValue + 20,
                    );
                    return (
                    <div key={section.title} className="template-section-meter">
                      <div className="flex items-center justify-between gap-3">
                        <strong>{section.title}</strong>
                        <span>{formatNumber(sectionPointValue)} P.</span>
                      </div>
                      <input
                        className="template-section-slider"
                        type="range"
                        min={POINT_STEP}
                        max={sliderMax}
                        step={POINT_STEP}
                        value={sectionPointValue}
                        style={{
                          "--template-slider-fill": `${Math.min(100, (sectionPointValue / sliderMax) * 100)}%`,
                        } as CSSProperties}
                        aria-label={`${section.title} Punkte`}
                        onChange={(event) => updateTemplateSectionPoint(index, Number(event.target.value))}
                      />
                      <p>{section.tasks.join(" · ")}</p>
                    </div>
                    );
                  })}
                </div>

                <div className="template-quick-settings">
                  <Field label="Zielpunktzahl">
                    <NumberInput className="field" value={totalPoints} min={1} step={0.5} onCommit={updateTotalPoints} />
                  </Field>
                  {renderTargetControls()}
                  {renderMetaSummary()}
                </div>

                <button
                  type="button"
                  className="button-primary w-full gap-2"
                  disabled={!canCreate}
                  onClick={() =>
                    adjustedSelectedTemplate &&
                    onSelectTemplate(
                      adjustedSelectedTemplate,
                      target,
                      gradeScale,
                      metaDraft,
                      target === "new" ? targetGroupId || null : null,
                      totalPoints,
                    )
                  }
                >
                  <DashboardIcon />
                  Erstellen und im EWH-Editor öffnen
                </button>
              </div>
            ) : (
              <div className="template-empty-state">
                <InfoIcon className="h-6 w-6" />
                <p className="themed-muted text-sm leading-6">Wähle eine Vorlage aus der Ergebnisliste.</p>
              </div>
            )}
          </aside>
          {renderMetaEditor()}
        </div>
      )}

      {mode === "pdf" && (
        <div className="template-secondary-layout">
          <section className="template-preview-panel">
            <h3 className="themed-strong text-xl font-semibold">Aus PDF starten</h3>
            <p className="themed-muted mt-2 text-sm leading-6">
              Nutze ein Aufgabenblatt oder einen vorhandenen Erwartungshorizont als Ausgangspunkt.
            </p>
            <Field label="Zielpunktzahl">
              <NumberInput className="field" value={totalPoints} min={1} step={0.5} onCommit={updateTotalPoints} />
            </Field>
            {renderTargetControls()}
            {renderMetaSummary()}
          </section>
          <PdfImportAssistant
            embedded
            disabled={!canCreate}
            applyLabel="Mit PDF-Vorschlag in EWH-Editor"
            onApplySuggestion={(suggestion) =>
              onApplyPdfSuggestion({
                suggestion,
                target,
                gradeScale,
                meta: metaDraft,
                targetGroupId: target === "new" ? targetGroupId || null : null,
              })
            }
          />
          {renderMetaEditor()}
        </div>
      )}

      {mode === "manual" && (
        <div className="template-secondary-layout">
          <section className="template-preview-panel">
            <h3 className="themed-strong text-xl font-semibold">Leere Struktur vorbereiten</h3>
            <p className="themed-muted mt-2 text-sm leading-6">
              Für Fälle ohne passende Vorlage: wenige Eckdaten setzen, dann im Editor ausarbeiten.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Fach">
                <select className="field" value={manualSubject} onChange={(event) => setManualSubject(event.target.value)}>
                  {[...BUILDER_SUBJECT_OPTIONS, "__custom__" as const].map((subject) => (
                    <option key={subject} value={subject}>
                      {subject === "__custom__" ? "Eigenes Fach" : subject}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Stufe">
                <select className="field" value={manualStage} onChange={(event) => setManualStage(event.target.value as BuilderSchoolStage)}>
                  <option value="sek1">Sekundarstufe I</option>
                  <option value="sek2">Sekundarstufe II</option>
                </select>
              </Field>
            </div>
            {manualSubject === "__custom__" && (
              <Field label="Eigenes Fach">
                <input
                  className="field"
                  placeholder="z. B. Physik, Politik, Biologie"
                  value={manualCustomSubject}
                  onChange={(event) => setManualCustomSubject(event.target.value)}
                />
              </Field>
            )}
            <Field label="Gesamtpunktzahl">
              <NumberInput className="field" value={totalPoints} min={1} step={0.5} onCommit={updateTotalPoints} />
            </Field>
            {renderTargetControls()}
            {renderMetaSummary()}
          </section>

          <section className="template-manual-panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="themed-strong text-lg font-semibold">Sektionen</h3>
                <p className="themed-muted mt-1 text-sm">
                  Summe: <strong>{formatNumber(weightSum)}</strong> / 100 %
                </p>
              </div>
              <button type="button" className="button-secondary px-3 py-2 text-xs" onClick={applyManualPreset}>
                Vorschlag laden
              </button>
            </div>

            {difference !== 0 && (
              <p className="warning-note text-xs">
                Noch {difference > 0 ? formatNumber(difference) : formatNumber(Math.abs(difference))} %{" "}
                {difference > 0 ? "zu verteilen" : "zu viel vergeben"}.
              </p>
            )}

            <div className="space-y-4">
              {sectionDrafts.map((section, index) => (
                <div key={section.id} className="template-manual-section">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="themed-strong text-sm font-semibold">{getPartLabel(index)}</p>
                    <span className="label">{formatNumber((totalPoints * section.weight) / 100)} Punkte</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px]">
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
                    <Field label="Gewichtung">
                      <NumberInput
                        className="field"
                        value={section.weight}
                        min={0}
                        step={0.5}
                        onCommit={(value) =>
                          setSectionDrafts((current) =>
                            current.map((entry) => (entry.id === section.id ? { ...entry, weight: value } : entry)),
                          )
                        }
                      />
                    </Field>
                  </div>
                  <Field label="Beschreibung">
                    <TextAreaField
                      className="mt-2 min-h-20"
                      value={section.description}
                      showListTransform
                      onValueChange={(value) =>
                        setSectionDrafts((current) =>
                          current.map((entry) =>
                            entry.id === section.id ? { ...entry, description: value } : entry,
                          ),
                        )
                      }
                    />
                  </Field>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="button-primary w-full gap-2"
              disabled={!canCreate || difference !== 0 || hasEmptyTitles}
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
              <DashboardIcon />
              Struktur im EWH-Editor öffnen
            </button>
          </section>
          {renderMetaEditor()}
        </div>
      )}
    </Card>
  );
};
