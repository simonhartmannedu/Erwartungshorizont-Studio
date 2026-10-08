import { type CSSProperties, type KeyboardEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ExamTemplateDefinition, TemplateSchoolForm } from "../data/templates";
import { BuilderSchoolStage, BUILDER_SUBJECT_OPTIONS, getBuilderGuidance } from "../data/builderResearch";
import { Exam, ExamMeta, GradeScale, Section, StudentGroup, Task } from "../types";
import { formatNumber } from "../utils/format";
import { applyNotengeneratorGradeScale } from "../utils/gradeScaleGenerator";
import { SECTION_CHART_PALETTE } from "../utils/sectionChart";
import { ExamHeaderForm } from "./ExamHeaderForm";
import {
  ChevronRightIcon,
  DuplicateIcon,
  DragIcon,
  InfoIcon,
  PencilIcon,
  PlusIcon,
  ReplaceIcon,
  TemplateIcon,
  TrashIcon,
} from "./icons";
import { Card, DismissibleCallout, Field, NumberInput, TextAreaField } from "./ui";

export interface GuidedSectionDraft {
  id: string;
  title: string;
  points: number;
  description: string;
}

export type GuidedBuilderTarget = "current" | "new";

type DecisionMode = "templates" | "manual";
type StageFilter = BuilderSchoolStage | "all";
type FocusFilter = ExamTemplateDefinition["focus"] | "all";
type SchoolFormFilter = TemplateSchoolForm | "all";
type SubjectThemeKey =
  | "deutsch"
  | "englisch"
  | "franzoesisch"
  | "spanisch"
  | "lateinisch"
  | "mathematik"
  | "geschichte"
  | "geographie"
  | "sozialwissenschaften"
  | "philosophie"
  | "biologie"
  | "chemie"
  | "physik"
  | "informatik"
  | "default";
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
  initialTarget?: GuidedBuilderTarget;
  lockTargetToNew?: boolean;
  allowUnassignedWorkspace?: boolean;
  easyMode?: boolean;
  onApplyManualStructure: (config: {
    totalPoints: number;
    gradeScale: GradeScale;
    sections: GuidedSectionDraft[];
    target: GuidedBuilderTarget;
    meta: ExamMeta;
    targetGroupId: string | null;
  }) => void;
  onApplyComposedTemplate: (config: {
    sections: Section[];
    gradeScale: GradeScale;
    target: GuidedBuilderTarget;
    meta: ExamMeta;
    targetGroupId: string | null;
  }) => void;
}

type ComposerSection = Pick<Section, "id" | "title" | "description" | "note" | "tasks">;

type ComposerLibraryItem = {
  id: string;
  subject: string;
  templateTitle: string;
  sectionTitle: string;
  task: Task;
};

const getPartLabel = (index: number) => `Teil ${String.fromCharCode(65 + index)}`;

const buildSectionDrafts = (
  sections: Array<{ title: string; weight: number; description: string }>,
  totalPoints: number,
) =>
  sections.map((section) => ({
    id: crypto.randomUUID(),
    title: section.title,
    points: Math.round(((totalPoints * section.weight) / 100) * 100) / 100,
    description: section.description,
  }));

const createFallbackSections = (totalPoints: number) =>
  buildSectionDrafts([
    { title: "Teil A", weight: 40, description: "Erster Kompetenzbereich." },
    { title: "Teil B", weight: 35, description: "Zweiter Kompetenzbereich." },
    { title: "Teil C", weight: 25, description: "Dritter Kompetenzbereich." },
  ], totalPoints);

const normalizeText = (value: string) => value.trim().toLowerCase();
const POINT_STEP = 0.5;

const stageLabel = (stage: BuilderSchoolStage) => (stage === "sek1" ? "Sek I" : "Sek II");

const focusLabel = (focus: ExamTemplateDefinition["focus"]) => (focus === "abitur" ? "Vorabitur" : "Standard");

const stageLongLabel = (stage: BuilderSchoolStage) => (stage === "sek1" ? "Sekundarstufe I" : "Sekundarstufe II");

const schoolFormLabel = (schoolForm: TemplateSchoolForm) => {
  switch (schoolForm) {
    case "grundschule":
      return "Grundschule";
    case "realschule":
      return "Realschule";
    case "sek1":
      return "Weitere Sek I";
    case "sek2":
      return "Sek II";
  }
};

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
  franzoesisch: {
    key: "franzoesisch",
    icon: "speech",
    pastel: "#E0F2FE",
    accent: "#0369A1",
  },
  spanisch: {
    key: "spanisch",
    icon: "speech",
    pastel: "#FFE4E6",
    accent: "#BE123C",
  },
  lateinisch: {
    key: "lateinisch",
    icon: "book",
    pastel: "#F3E8FF",
    accent: "#7E22CE",
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
  geographie: {
    key: "geographie",
    icon: "history",
    pastel: "#DBEAFE",
    accent: "#2563EB",
  },
  sozialwissenschaften: {
    key: "sozialwissenschaften",
    icon: "history",
    pastel: "#EDE9FE",
    accent: "#6D28D9",
  },
  philosophie: {
    key: "philosophie",
    icon: "book",
    pastel: "#E5E7EB",
    accent: "#4B5563",
  },
  biologie: {
    key: "biologie",
    icon: "flask",
    pastel: "#DCFCE7",
    accent: "#15803D",
  },
  chemie: {
    key: "chemie",
    icon: "flask",
    pastel: "#D7F3E3",
    accent: "#2F8F62",
  },
  physik: {
    key: "physik",
    icon: "calculator",
    pastel: "#E0E7FF",
    accent: "#4338CA",
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
  if (normalized.includes("franz")) return SUBJECT_THEMES.franzoesisch;
  if (normalized.includes("span")) return SUBJECT_THEMES.spanisch;
  if (normalized.includes("latein")) return SUBJECT_THEMES.lateinisch;
  if (normalized.includes("mathematik") || normalized.includes("math")) return SUBJECT_THEMES.mathematik;
  if (normalized.includes("geschichte") || normalized.includes("history")) return SUBJECT_THEMES.geschichte;
  if (normalized.includes("geographie") || normalized.includes("erdkunde")) return SUBJECT_THEMES.geographie;
  if (normalized.includes("sozialwissenschaft")) return SUBJECT_THEMES.sozialwissenschaften;
  if (normalized.includes("philosophie")) return SUBJECT_THEMES.philosophie;
  if (normalized.includes("biologie")) return SUBJECT_THEMES.biologie;
  if (normalized.includes("chemie") || normalized.includes("science")) return SUBJECT_THEMES.chemie;
  if (normalized.includes("physik")) return SUBJECT_THEMES.physik;
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
  const sections: Section[] = exam.sections.map((section, index) => {
    const sectionTarget = sectionPoints[index] ?? section.tasks.reduce((sum, task) => sum + task.maxPoints, 0);
    return {
      ...section,
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

const buildComposerSections = (template: ExamTemplateDefinition, sectionPoints: number[]): ComposerSection[] =>
  createAdjustedTemplate(template, sectionPoints)
    .build()
    .sections.map(({ id, title, description, note, tasks }) => ({ id, title, description, note, tasks }));

const getComposerTotal = (sections: ComposerSection[]) =>
  Math.round(sections.reduce((sum, section) => sum + section.tasks.reduce((taskSum, task) => taskSum + task.maxPoints, 0), 0) * 100) / 100;

const cloneComposerTask = (task: Task, category: string): Task => ({
  ...task,
  id: crypto.randomUUID(),
  category,
  achievedPoints: 0,
});

const composerTaskDndId = (taskId: string) => `composer-task:${taskId}`;
const composerSectionDndId = (sectionId: string) => `composer-section:${sectionId}`;

const ComposerLibraryTask = ({
  item,
  onAdd,
}: {
  item: ComposerLibraryItem;
  onAdd: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `library-task:${item.id}`,
    data: { type: "library-task", itemId: item.id },
  });

  return (
    <article
      ref={setNodeRef}
      className={`composer-library-task ${isDragging ? "composer-library-task-dragging" : ""}`}
      style={{ transform: CSS.Translate.toString(transform) }}
    >
      <button
        type="button"
        className="composer-drag-handle"
        aria-label={`Aufgabe ${item.task.title} ziehen`}
        title="Aufgabe ziehen"
        {...attributes}
        {...listeners}
      >
        <DragIcon />
      </button>
      <div className="min-w-0 flex-1">
        <strong>{item.task.title}</strong>
        <p>{item.sectionTitle} · {formatNumber(item.task.maxPoints)} P.</p>
      </div>
      <button type="button" className="button-secondary composer-add-button" onClick={onAdd}>
        +
        <span className="sr-only">Zu aktivem Teil hinzufügen</span>
      </button>
    </article>
  );
};

const ComposerSectionDropArea = ({ sectionId, children }: { sectionId: string; children: ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: composerSectionDndId(sectionId),
    data: { type: "section", sectionId },
  });

  return (
    <div ref={setNodeRef} className={`composer-section-drop-area ${isOver ? "composer-section-drop-area-over" : ""}`}>
      {children}
    </div>
  );
};

const ComposerTaskRow = ({
  section,
  task,
  sections,
  onPointsChange,
  onRemove,
  onDuplicate,
  onMoveToSection,
}: {
  section: ComposerSection;
  task: Task;
  sections: ComposerSection[];
  onPointsChange: (value: number) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMoveToSection: (sectionId: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: composerTaskDndId(task.id),
    data: { type: "composer-task", sectionId: section.id, taskId: task.id },
  });
  const destinations = sections.filter((candidate) => candidate.id !== section.id);

  return (
    <article
      ref={setNodeRef}
      className={`composer-task-row ${isDragging ? "composer-task-row-dragging" : ""}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        type="button"
        className="composer-drag-handle"
        aria-label={`Aufgabe ${task.title} verschieben`}
        title="Aufgabe ziehen oder mit Leertaste verschieben"
        {...attributes}
        {...listeners}
      >
        <DragIcon />
      </button>
      <div className="min-w-0 flex-1">
        <strong>{task.title}</strong>
        <p>{task.description || task.expectation || "Ohne Beschreibung"}</p>
      </div>
      <NumberInput className="field composer-task-points" value={task.maxPoints} min={0} step={0.5} onCommit={onPointsChange} />
      <div className="composer-task-actions">
        {destinations.length > 0 ? (
          <select
            className="field composer-task-move"
            value=""
            aria-label={`${task.title} in einen anderen Teil verschieben`}
            onChange={(event) => {
              if (event.target.value) onMoveToSection(event.target.value);
            }}
          >
            <option value="" disabled>Verschieben</option>
            {destinations.map((destination) => <option key={destination.id} value={destination.id}>{destination.title || "Unbenannter Teil"}</option>)}
          </select>
        ) : null}
        <button type="button" className="icon-button" title="Aufgabe duplizieren" onClick={onDuplicate}><DuplicateIcon /></button>
        <button type="button" className="icon-button" title="Aufgabe entfernen" onClick={onRemove}><TrashIcon /></button>
      </div>
    </article>
  );
};

const polarToCartesian = (cx: number, cy: number, radius: number, angleInDegrees: number) => {
  const radians = ((angleInDegrees - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
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

interface TemplateAllocationSection {
  title: string;
  tasks: string[];
  points: number;
}

const TemplateAllocationChart = ({
  sections,
  totalPoints,
  activeIndex,
  onActiveIndexChange,
  onPointChange,
}: {
  sections: TemplateAllocationSection[];
  totalPoints: number;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onPointChange: (index: number, value: number) => void;
}) => {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const innerRadius = 58;
  const outerRadius = 98;
  const safeTotal = Math.max(totalPoints, POINT_STEP);
  let currentAngle = 0;
  const activeSection = sections[activeIndex] ?? sections[0] ?? null;

  const handleSliceKeyDown = (event: KeyboardEvent<SVGPathElement>, index: number, currentPoints: number) => {
    if (!["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === "ArrowUp" || event.key === "ArrowRight" ? 1 : -1;
    onActiveIndexChange(index);
    onPointChange(index, Math.max(POINT_STEP, currentPoints + direction * POINT_STEP));
  };

  return (
    <div className="template-allocation-chart">
      <div className="template-donut-shell">
        <svg className="template-donut-svg" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Punkteverteilung der Vorlage">
          <circle className="template-donut-track" cx={cx} cy={cy} r={(innerRadius + outerRadius) / 2} />
          {sections.map((section, index) => {
            const points = Math.max(0, section.points);
            const startAngle = currentAngle;
            currentAngle += (points / safeTotal) * 360;
            const percentage = safeTotal > 0 ? (points / safeTotal) * 100 : 0;
            const active = index === activeIndex;

            return (
              <path
                key={`${section.title}-${index}`}
                className={`template-donut-slice ${active ? "template-donut-slice-active" : ""}`}
                d={describeDonutSlice(cx, cy, innerRadius, outerRadius, startAngle, currentAngle)}
                fill={SECTION_CHART_PALETTE[index % SECTION_CHART_PALETTE.length]}
                role="button"
                tabIndex={0}
                aria-label={`${section.title}: ${formatNumber(points)} Punkte, ${formatNumber(percentage)} Prozent`}
                onClick={() => onActiveIndexChange(index)}
                onFocus={() => onActiveIndexChange(index)}
                onKeyDown={(event) => handleSliceKeyDown(event, index, points)}
              />
            );
          })}
        </svg>
        <div className="template-donut-center" aria-hidden="true">
          <strong>{formatNumber(totalPoints)}</strong>
          <span>Punkte</span>
        </div>
      </div>

      {activeSection ? (
        <div className="template-donut-active">
          <span>{activeSection.title}</span>
          <strong>{formatNumber(activeSection.points)} P. · {formatNumber((activeSection.points / safeTotal) * 100)}%</strong>
        </div>
      ) : null}

      <div className="template-donut-legend">
        {sections.map((section, index) => {
          const percentage = safeTotal > 0 ? (section.points / safeTotal) * 100 : 0;
          const color = SECTION_CHART_PALETTE[index % SECTION_CHART_PALETTE.length];
          return (
            <div key={`${section.title}-control`} className={`template-donut-row ${index === activeIndex ? "template-donut-row-active" : ""}`}>
              <button type="button" className="template-donut-row-main" onClick={() => onActiveIndexChange(index)} aria-label={`${section.title} markieren`}>
                <span className="template-donut-swatch" style={{ background: color }} aria-hidden="true" />
                <span><strong>{section.title}</strong><small>{section.tasks.join(" · ")}</small></span>
              </button>
              <label className="template-donut-points">
                <span>{formatNumber(percentage)}%</span>
                <NumberInput className="field" value={section.points} min={POINT_STEP} step={POINT_STEP} onCommit={(value) => onPointChange(index, value)} />
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
};

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
    schoolFormLabel(template.schoolForm),
    stageLabel(template.schoolStage),
    stageLongLabel(template.schoolStage),
    focusLabel(template.focus),
    `${template.totalPoints} Punkte`,
    template.description,
    template.pedagogicalHint,
    template.standardsNote ?? "",
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
  initialTarget = "new",
  lockTargetToNew = false,
  allowUnassignedWorkspace = false,
  easyMode = false,
  onApplyManualStructure,
  onApplyComposedTemplate,
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
  const [schoolFormFilter, setSchoolFormFilter] = useState<SchoolFormFilter>("all");
  const [focusFilter, setFocusFilter] = useState<FocusFilter>("all");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(initialTemplateId);
  const [composerTemplateId, setComposerTemplateId] = useState<string | null>(null);
  const [blankComposer, setBlankComposer] = useState(false);
  const [composerSections, setComposerSections] = useState<ComposerSection[]>([]);
  const [composerQuery, setComposerQuery] = useState("");
  const [composerSubjectFilter, setComposerSubjectFilter] = useState<string>(initialSubject || "all");
  const [activeComposerSectionId, setActiveComposerSectionId] = useState<string | null>(null);
  const [composerSidebarTab, setComposerSidebarTab] = useState<"outline" | "library">("library");
  const [composerToolsOpen, setComposerToolsOpen] = useState(false);
  const [composerReviewOpen, setComposerReviewOpen] = useState(false);
  const [draggedTaskTitle, setDraggedTaskTitle] = useState<string | null>(null);
  const [templatePointDrafts, setTemplatePointDrafts] = useState<Record<string, number[]>>({});
  const [activeTemplateSectionIndex, setActiveTemplateSectionIndex] = useState(0);
  const [target, setTarget] = useState<GuidedBuilderTarget>(initialTarget);
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
    initialSections.length > 0 ? initialSections : createFallbackSections(initialTotalPoints),
  );
  const [metaDraft, setMetaDraft] = useState<ExamMeta>(() => ({ ...initialMeta }));
  const composerSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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
        const stageMatches = stageFilter === "all" || (template.schoolStage === stageFilter && template.schoolForm !== "grundschule");
        const schoolFormMatches = schoolFormFilter === "all" || template.schoolForm === schoolFormFilter;
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
          visible: queryMatches && subjectMatches && stageMatches && schoolFormMatches && focusMatches,
          score,
        };
      })
      .filter((entry) => entry.visible)
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .map((entry) => entry.template);
  }, [focusFilter, initialSubject, query, schoolFormFilter, stageFilter, subjectFilter, templates]);

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
  const composerTemplate = useMemo(
    () => templates.find((template) => template.id === composerTemplateId) ?? null,
    [composerTemplateId, templates],
  );
  const isComposerOpen = Boolean(composerTemplate || blankComposer);
  const composerSubject = composerTemplate?.subject || metaDraft.subject.trim() || initialSubject.trim() || "Alle Fächer";
  const composerStage = composerTemplate?.schoolStage ?? manualStage;
  const composerTotalPoints = useMemo(() => getComposerTotal(composerSections), [composerSections]);
  const composerTaskCount = useMemo(
    () => composerSections.reduce((sum, section) => sum + section.tasks.length, 0),
    [composerSections],
  );
  const composerLibrary = useMemo<ComposerLibraryItem[]>(() => {
    const normalizedQuery = normalizeText(composerQuery);
    return templates.flatMap((template) =>
      template.build().sections.flatMap((section) =>
        section.tasks.map((task, taskIndex) => ({
          id: `${template.id}:${section.id}:${taskIndex}`,
          subject: template.subject,
          templateTitle: template.shortLabel,
          sectionTitle: section.title,
          task,
        })),
      ),
    ).filter((item) => {
      const subjectMatches = composerSubjectFilter === "all" || item.subject === composerSubjectFilter;
      const text = `${item.subject} ${item.templateTitle} ${item.sectionTitle} ${item.task.title} ${item.task.description} ${item.task.expectation}`.toLowerCase();
      return subjectMatches && (!normalizedQuery || text.includes(normalizedQuery));
    });
  }, [composerQuery, composerSubjectFilter, templates]);

  const manualResolvedSubject = manualSubject === "__custom__" ? manualCustomSubject.trim() : manualSubject;
  const manualGuidance = useMemo(
    () => getBuilderGuidance(manualResolvedSubject || "Eigenes Fach", manualStage),
    [manualResolvedSubject, manualStage],
  );
  const activeScaleStage = selectedTemplate?.schoolStage ?? manualStage;
  const sectionPointSum = useMemo(
    () => Math.round(sectionDrafts.reduce((sum, section) => sum + section.points, 0) * 100) / 100,
    [sectionDrafts],
  );
  const difference = Math.round((totalPoints - sectionPointSum) * 100) / 100;
  const hasEmptyTitles = sectionDrafts.some((section) => !section.title.trim());
  const canCreate = target === "current" || Boolean(targetGroupId) || allowUnassignedWorkspace;

  useEffect(() => {
    setMetaDraft({ ...initialMeta });
  }, [initialMeta]);

  useEffect(() => {
    setTarget(initialTarget);
  }, [initialTarget]);

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
    if (mode !== "templates" || !selectedTemplate || isComposerOpen) return;
    setTotalPoints(selectedTemplateTotalPoints);
    setGradeScale((current) => gradeScaleFor(current, selectedTemplateTotalPoints, selectedTemplate.schoolStage));
  }, [isComposerOpen, mode, selectedTemplate?.id, selectedTemplateTotalPoints]);

  useEffect(() => {
    if (!isComposerOpen) return;
    const nextTotal = getComposerTotal(composerSections);
    setTotalPoints(nextTotal);
    setGradeScale((current) => gradeScaleFor(current, nextTotal, composerStage));
  }, [composerSections, composerStage, isComposerOpen]);

  useEffect(() => {
    if (!selectedTemplate || activeTemplateSectionIndex < selectedTemplate.previewSections.length) return;
    setActiveTemplateSectionIndex(0);
  }, [activeTemplateSectionIndex, selectedTemplate]);

  useEffect(() => {
    if (mode !== "manual" || isComposerOpen) return;
    setTotalPoints(manualGuidance.preset.totalPoints);
    setSectionDrafts(buildSectionDrafts(manualGuidance.preset.sections, manualGuidance.preset.totalPoints));
    setGradeScale((current) => gradeScaleFor(current, manualGuidance.preset.totalPoints, manualStage));
  }, [isComposerOpen, manualGuidance, manualStage, mode]);

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

  const openComposer = (template: ExamTemplateDefinition) => {
    const sectionPoints = templatePointDrafts[template.id] ?? getTemplateDefaultSectionPoints(template);
    const sections = buildComposerSections(template, sectionPoints);
    setSelectedTemplateId(template.id);
    setComposerTemplateId(template.id);
    setBlankComposer(false);
    setComposerSections(sections);
    setComposerSubjectFilter(template.subject);
    setComposerQuery("");
    setActiveComposerSectionId(sections[0]?.id ?? null);
    setComposerSidebarTab("library");
    setComposerToolsOpen(false);
    setComposerReviewOpen(false);
    const nextTotal = getComposerTotal(sections);
    setTotalPoints(nextTotal);
    setGradeScale((current) => gradeScaleFor(current, nextTotal, template.schoolStage));
  };

  const openBlankComposer = () => {
    const sections: ComposerSection[] = [{
      id: crypto.randomUUID(),
      title: "Teil A",
      description: "",
      note: "",
      tasks: [],
    }];
    setMode("manual");
    setComposerTemplateId(null);
    setBlankComposer(true);
    setComposerSections(sections);
    setComposerSubjectFilter("all");
    setComposerQuery("");
    setActiveComposerSectionId(sections[0].id);
    setComposerSidebarTab("library");
    setComposerToolsOpen(false);
    setComposerReviewOpen(false);
    setTotalPoints(0);
    setGradeScale((current) => gradeScaleFor(current, 1, manualStage));
  };

  const updateComposerSections = (updater: (current: ComposerSection[]) => ComposerSection[]) => {
    setComposerSections(updater);
  };

  const appendLibraryItem = (item: ComposerLibraryItem, sectionId = activeComposerSectionId) => {
    const destinationId = sectionId ?? composerSections[0]?.id;
    if (!destinationId) return;
    updateComposerSections((current) => current.map((section) => (
      section.id === destinationId
        ? { ...section, tasks: [...section.tasks, cloneComposerTask(item.task, section.title)] }
        : section
    )));
  };

  const moveComposerTask = (sourceSectionId: string, taskId: string, targetSectionId: string, insertionIndex: number) => {
    updateComposerSections((current) => {
      const sourceSection = current.find((section) => section.id === sourceSectionId);
      const task = sourceSection?.tasks.find((entry) => entry.id === taskId);
      if (!task) return current;
      const sourceIndex = sourceSection?.tasks.findIndex((entry) => entry.id === taskId) ?? -1;
      const withoutTask = current.map((section) => section.id === sourceSectionId
        ? { ...section, tasks: section.tasks.filter((entry) => entry.id !== taskId) }
        : section);
      return withoutTask.map((section) => {
        if (section.id !== targetSectionId) return section;
        const adjustedIndex = sourceSectionId === targetSectionId && sourceIndex < insertionIndex
          ? insertionIndex - 1
          : insertionIndex;
        const tasks = [...section.tasks];
        tasks.splice(Math.max(0, Math.min(adjustedIndex, tasks.length)), 0, { ...task, category: section.title });
        return { ...section, tasks };
      });
    });
  };

  const updateComposerTask = (sectionId: string, taskId: string, updater: (task: Task) => Task) => {
    updateComposerSections((current) => current.map((section) => section.id === sectionId
      ? { ...section, tasks: section.tasks.map((task) => task.id === taskId ? updater(task) : task) }
      : section));
  };

  const getComposerDropDestination = (overId: string | number) => {
    const id = String(overId);
    if (id.startsWith("composer-section:")) {
      const sectionId = id.slice("composer-section:".length);
      const section = composerSections.find((entry) => entry.id === sectionId);
      return section ? { sectionId, insertionIndex: section.tasks.length } : null;
    }
    if (!id.startsWith("composer-task:")) return null;
    const taskId = id.slice("composer-task:".length);
    const section = composerSections.find((entry) => entry.tasks.some((task) => task.id === taskId));
    if (!section) return null;
    return { sectionId: section.id, insertionIndex: section.tasks.findIndex((task) => task.id === taskId) };
  };

  const handleComposerDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === "library-task") {
      setDraggedTaskTitle(composerLibrary.find((item) => item.id === data.itemId)?.task.title ?? "Aufgabe");
      return;
    }
    if (data?.type === "composer-task") {
      const source = composerSections.find((section) => section.id === data.sectionId);
      setDraggedTaskTitle(source?.tasks.find((task) => task.id === data.taskId)?.title ?? "Aufgabe");
    }
  };

  const handleComposerDragEnd = (event: DragEndEvent) => {
    setDraggedTaskTitle(null);
    if (!event.over) return;
    const dropDestination = getComposerDropDestination(event.over.id);
    if (!dropDestination) return;
    const data = event.active.data.current;
    if (data?.type === "library-task") {
      const item = composerLibrary.find((entry) => entry.id === data.itemId);
      if (!item) return;
      updateComposerSections((current) => current.map((section) => section.id === dropDestination.sectionId
        ? {
            ...section,
            tasks: [
              ...section.tasks.slice(0, dropDestination.insertionIndex),
              cloneComposerTask(item.task, section.title),
              ...section.tasks.slice(dropDestination.insertionIndex),
            ],
          }
        : section));
      setActiveComposerSectionId(dropDestination.sectionId);
      return;
    }
    if (data?.type === "composer-task") {
      let destination = dropDestination;
      if (data.sectionId === destination.sectionId) {
        const sourceIndex = composerSections.find((section) => section.id === data.sectionId)?.tasks.findIndex((task) => task.id === data.taskId) ?? -1;
        if (sourceIndex >= 0 && sourceIndex < destination.insertionIndex) {
          destination = { ...destination, insertionIndex: destination.insertionIndex + 1 };
        }
      }
      moveComposerTask(data.sectionId, data.taskId, destination.sectionId, destination.insertionIndex);
      setActiveComposerSectionId(destination.sectionId);
    }
  };

  const resetFilters = () => {
    setQuery("");
    setSubjectFilter("all");
    setStageFilter("all");
    setSchoolFormFilter("all");
    setFocusFilter("all");
  };

  const applyManualPreset = () => {
    setTotalPoints(manualGuidance.preset.totalPoints);
    setSectionDrafts(buildSectionDrafts(manualGuidance.preset.sections, manualGuidance.preset.totalPoints));
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
    const Icon = nextMode === "templates" ? TemplateIcon : PencilIcon;
    return (
      <button
        type="button"
        className={`template-mode-button ${active ? "template-mode-button-active" : ""}`}
        onClick={() => {
          if (nextMode === "manual") {
            openBlankComposer();
            return;
          }
          setMode(nextMode);
          setComposerTemplateId(null);
          setBlankComposer(false);
        }}
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

  const canSubmitCurrentMode =
    canCreate &&
    Boolean(isComposerOpen && composerSections.some((section) => section.tasks.length > 0));

  const submitCurrentMode = () => {
    if (isComposerOpen && composerSections.some((section) => section.tasks.length > 0)) {
      onApplyComposedTemplate({
        sections: composerSections.map((section) => ({
          ...section,
          title: section.title.trim() || "Aufgabenteil",
          description: section.description.trim(),
          note: section.note.trim(),
          linkedSectionId: null,
          maxPointsOverride: null,
          tasks: section.tasks.map((task) => ({ ...task, category: section.title.trim() || "Aufgabenteil" })),
        })),
        gradeScale,
        target,
        meta: metaDraft,
        targetGroupId: target === "new" ? targetGroupId || null : null,
      });
      return;
    }

    if (mode === "manual" && difference === 0 && !hasEmptyTitles) {
      onApplyManualStructure({
        totalPoints,
        gradeScale,
        sections: sectionDrafts,
        target,
        meta: metaDraft,
        targetGroupId: target === "new" ? targetGroupId || null : null,
      });
    }
  };

  const renderTargetControls = () => (
    <div className="space-y-4">
      {easyMode ? (
        <DismissibleCallout tone="info" resetKey="template-decision-easy-mode">
          Der EWH wird ohne Lerngruppe angelegt. Du kannst ihn anschließend direkt bearbeiten und exportieren.
        </DismissibleCallout>
      ) : (
        <>
      <div className={`grid gap-3 ${lockTargetToNew ? "sm:grid-cols-1" : "sm:grid-cols-2"}`}>
        <button
          type="button"
          className={`${target === "new" ? "button-primary" : "button-secondary"} w-full justify-start gap-2 p-3 text-left`}
          onClick={() => setTarget("new")}
        >
          <PlusIcon />
          Neue Klassenarbeit
        </button>
        {!lockTargetToNew ? (
          <button
            type="button"
            className={`${target === "current" ? "button-primary" : "button-secondary"} w-full justify-start gap-2 p-3 text-left`}
            onClick={() => setTarget("current")}
          >
            <ReplaceIcon />
            Aktuelle ersetzen
          </button>
        ) : null}
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
        ) : allowUnassignedWorkspace ? (
          <DismissibleCallout tone="info" resetKey="template-decision-unassigned-workspace">
            Die Klassenarbeit wird zunächst ohne Lerngruppe angelegt und kann später zugeordnet werden.
          </DismissibleCallout>
        ) : (
          <DismissibleCallout tone="warning" resetKey="template-decision-no-groups">
            Für neue Klassenarbeiten muss zuerst eine Lerngruppe angelegt werden.
          </DismissibleCallout>
        ))}
        </>
      )}
    </div>
  );

  const renderMetaSummary = () => (
    <div className="template-meta-summary">
      <div>
        <span>Schuljahr</span>
        <strong>{metaDraft.schoolYear.trim() || "Hier Schuljahr eintragen"}</strong>
      </div>
      <div>
        <span>Fach</span>
        <strong>{metaDraft.subject.trim() || "Hier Fach eintragen"}</strong>
      </div>
      <div>
        <span>Jahrgang</span>
        <strong>{metaDraft.gradeLevel.trim() || "Hier Jahrgang eintragen"}</strong>
      </div>
      <div>
        <span>Kurs / Klasse</span>
        <strong>{metaDraft.course.trim() || "Hier Kurs oder Klasse eintragen"}</strong>
      </div>
      <div>
        <span>Lehrkraft</span>
        <strong>{metaDraft.teacher.trim() || "Hier Lehrkraft eintragen"}</strong>
      </div>
      <div>
        <span>Titel</span>
        <strong>{metaDraft.title.trim() || "Hier Titel eintragen"}</strong>
      </div>
      <div>
        <span>Datum</span>
        <strong>{metaDraft.examDate || "Hier Datum eintragen"}</strong>
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
        {showMetaSettings ? "Rahmendaten ausblenden" : "Allgemeine Rahmendaten bearbeiten"}
      </button>
    </div>
  );

  const renderMetaEditor = () =>
    showMetaSettings ? (
      <section ref={metaEditorRef} className="template-meta-editor">
        <div className="template-meta-editor-header">
          <div>
            <p className="label">Allgemeine Rahmendaten</p>
            <h3 className="themed-strong text-lg font-semibold">EWH vor dem Öffnen beschriften</h3>
            <p className="themed-muted mt-1 text-sm leading-6">
              Schuljahr, Fach, Jahrgang, Lerngruppe, Lehrkraft, Titel, Thema und Datum werden direkt in den neuen Erwartungshorizont übernommen.
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
        onClick={() => openComposer(template)}
        aria-pressed={selected}
      >
        <span className="template-subject-mark" aria-hidden="true">
          <SubjectThemeIcon icon={subjectTheme.icon} />
        </span>
        <span className="template-result-main">
          <span className="template-result-title-row">
            <span className="template-result-title">{template.title}</span>
            {index === 0 && <span className="template-badge template-badge-strong">Beste Auswahl</span>}
          </span>
          <span className="template-result-copy">{template.description}</span>
        </span>
        <span className="template-result-meta">
          <span>{template.subject}</span>
          <span>{schoolFormLabel(template.schoolForm)}</span>
          <span>{focusLabel(template.focus)}</span>
          <strong>{formatNumber(template.totalPoints)} P.</strong>
        </span>
      </button>
    );
  };

  const renderComposer = () => {
    const composerSubjects = availableSubjects.filter((subject) => templates.some((template) => template.subject === subject));
    const addComposerSection = () => {
      const section: ComposerSection = {
        id: crypto.randomUUID(),
        title: `Teil ${String.fromCharCode(65 + composerSections.length)}`,
        description: "",
        note: "",
        tasks: [],
      };
      updateComposerSections((current) => [...current, section]);
      setActiveComposerSectionId(section.id);
      setComposerSidebarTab("outline");
    };

    return (
      <DndContext
        sensors={composerSensors}
        collisionDetection={closestCenter}
        onDragStart={handleComposerDragStart}
        onDragCancel={() => setDraggedTaskTitle(null)}
        onDragEnd={handleComposerDragEnd}
        accessibility={{
          screenReaderInstructions: {
            draggable: "Leertaste oder Enter nimmt eine Aufgabe auf. Mit den Pfeiltasten verschiebst du sie, mit Leertaste oder Enter legst du sie ab. Escape bricht ab.",
          },
        }}
      >
        <div className="composer" aria-label="Klausur zusammenstellen">
          <div className="composer-header" style={getSubjectThemeStyle(getSubjectTheme(composerSubject))}>
            <div>
              <p className="label">Zusammenstellung</p>
              <h3 className="themed-strong mt-1 text-xl font-semibold">{composerTemplate?.title ?? "Leere Klausur zusammenstellen"}</h3>
              <p className="themed-muted mt-1 text-sm leading-6">Aufgaben auswählen, Reihenfolge festlegen, dann Rahmendaten prüfen.</p>
            </div>
            <div className="composer-header-actions">
              <span className="composer-stat"><strong>{formatNumber(composerTotalPoints)} P.</strong><small>{composerTaskCount} Aufgaben</small></span>
              <button type="button" className="button-secondary px-3 py-2 text-xs" onClick={() => { setComposerTemplateId(null); setBlankComposer(false); setComposerReviewOpen(false); setMode("templates"); }}>Vorlage wechseln</button>
              <button type="button" className="button-primary px-3 py-2 text-xs" disabled={!canSubmitCurrentMode} onClick={() => setComposerReviewOpen(true)}>Vorschau &amp; erstellen</button>
            </div>
          </div>

          <div className={`composer-layout ${composerToolsOpen ? "composer-layout-tools-open" : ""}`}>
            <aside className="composer-sidebar">
              <button type="button" className="composer-sidebar-close" onClick={() => setComposerToolsOpen(false)}>Werkzeuge schließen</button>
              <div className="composer-sidebar-tabs" role="tablist" aria-label="Werkzeuge für die Zusammenstellung">
                <button type="button" role="tab" aria-selected={composerSidebarTab === "outline"} className={composerSidebarTab === "outline" ? "composer-sidebar-tab-active" : ""} onClick={() => { setComposerSidebarTab("outline"); setComposerToolsOpen(false); }}>Gliederung</button>
                <button type="button" role="tab" aria-selected={composerSidebarTab === "library"} className={composerSidebarTab === "library" ? "composer-sidebar-tab-active" : ""} onClick={() => setComposerSidebarTab("library")}>Bibliothek <span>{composerLibrary.length}</span></button>
              </div>

              {composerSidebarTab === "outline" ? (
                <div className="composer-outline" role="tabpanel">
                  <p className="themed-muted text-xs leading-5">Wähle einen Teil aus oder ergänze einen neuen.</p>
                  {composerSections.map((section, index) => (
                    <button key={section.id} type="button" className={`composer-outline-item ${activeComposerSectionId === section.id ? "composer-outline-item-active" : ""}`} onClick={() => setActiveComposerSectionId(section.id)}>
                      <span>{getPartLabel(index)}</span><strong>{section.title || "Unbenannter Teil"}</strong><small>{section.tasks.length} Aufgaben · {formatNumber(section.tasks.reduce((sum, task) => sum + task.maxPoints, 0))} P.</small>
                    </button>
                  ))}
                  <button type="button" className="button-secondary mt-2 w-full justify-center gap-2" onClick={addComposerSection}><PlusIcon />Teil ergänzen</button>
                </div>
              ) : (
                <div className="composer-library" role="tabpanel">
                  <div className="composer-library-heading">
                    <p className="themed-muted text-xs leading-5">{composerTemplate ? `Aufgaben für ${composerSubject}; andere Fächer sind optional.` : "Wähle passende Aufgaben aus der Bibliothek."}</p>
                  </div>
                  <input className="field" value={composerQuery} onChange={(event) => setComposerQuery(event.target.value)} placeholder="Aufgabe suchen …" aria-label="Aufgaben durchsuchen" />
                  <select className="field composer-library-filter" value={composerSubjectFilter} aria-label="Fach für Aufgaben filtern" onChange={(event) => setComposerSubjectFilter(event.target.value)}>
                    {composerTemplate ? <option value={composerSubject}>{composerSubject}</option> : null}
                    <option value="all">Alle Fächer</option>
                    {composerSubjects.filter((subject) => subject !== composerSubject).map((subject) => <option key={subject} value={subject}>{subject}</option>)}
                  </select>
                  <div className="composer-library-list">
                    {composerLibrary.map((item) => <ComposerLibraryTask key={item.id} item={item} onAdd={() => appendLibraryItem(item)} />)}
                    {composerLibrary.length === 0 && <p className="themed-muted text-sm">Keine passenden Elemente gefunden.</p>}
                  </div>
                </div>
              )}
            </aside>

            <section className="composer-canvas">
              <div className="composer-canvas-toolbar">
                <div><span>Aufbau</span><strong>{formatNumber(composerTotalPoints)} Punkte · {composerTaskCount} Aufgaben</strong></div>
                <div className="flex gap-2"><button type="button" className="button-secondary composer-mobile-tools-trigger px-3 py-2 text-xs" onClick={() => setComposerToolsOpen(true)}>Bibliothek</button><button type="button" className="button-secondary px-3 py-2 text-xs" onClick={addComposerSection}><PlusIcon />Teil ergänzen</button></div>
              </div>
              {composerSections.map((section, index) => (
                <section key={section.id} className={`composer-section ${activeComposerSectionId === section.id ? "composer-section-active" : ""}`} onFocus={() => setActiveComposerSectionId(section.id)}>
                  <div className="composer-section-header">
                    <span className="composer-part-label">{getPartLabel(index)}</span>
                    <input className="field" value={section.title} aria-label="Titel des Aufgabenteils" onFocus={() => setActiveComposerSectionId(section.id)} onChange={(event) => updateComposerSections((current) => current.map((entry) => entry.id === section.id ? { ...entry, title: event.target.value } : entry))} />
                    <strong>{formatNumber(section.tasks.reduce((sum, task) => sum + task.maxPoints, 0))} P.</strong>
                  </div>
                  <ComposerSectionDropArea sectionId={section.id}>
                    <SortableContext items={section.tasks.map((task) => composerTaskDndId(task.id))} strategy={verticalListSortingStrategy}>
                      <div className="composer-task-list">
                        {section.tasks.map((task) => (
                          <ComposerTaskRow
                            key={task.id}
                            section={section}
                            task={task}
                            sections={composerSections}
                            onPointsChange={(value) => updateComposerTask(section.id, task.id, (current) => ({ ...current, maxPoints: value, achievedPoints: Math.min(current.achievedPoints, value) }))}
                            onRemove={() => updateComposerSections((current) => current.map((entry) => entry.id === section.id ? { ...entry, tasks: entry.tasks.filter((candidate) => candidate.id !== task.id) } : entry))}
                            onDuplicate={() => updateComposerSections((current) => current.map((entry) => entry.id === section.id ? { ...entry, tasks: [...entry.tasks, cloneComposerTask(task, entry.title)] } : entry))}
                            onMoveToSection={(targetSectionId) => moveComposerTask(section.id, task.id, targetSectionId, composerSections.find((entry) => entry.id === targetSectionId)?.tasks.length ?? 0)}
                          />
                        ))}
                        {section.tasks.length === 0 ? <p className="composer-empty-dropzone">Aufgabe hier ablegen oder aus der Bibliothek hinzufügen</p> : null}
                      </div>
                    </SortableContext>
                  </ComposerSectionDropArea>
                  <button type="button" className="composer-add-inline" onClick={() => { setActiveComposerSectionId(section.id); setComposerSidebarTab("library"); setComposerToolsOpen(true); }}>+ Aufgabe aus Bibliothek</button>
                </section>
              ))}
            </section>
          </div>

          {composerReviewOpen ? (
            <div className="composer-review-backdrop" role="presentation">
              <section className="composer-review" role="dialog" aria-modal="true" aria-labelledby="composer-review-title">
                <div className="composer-review-header">
                  <div><p className="label">Letzter Schritt</p><h4 id="composer-review-title" className="themed-strong mt-1 text-xl font-semibold">Vorschau &amp; erstellen</h4><p className="themed-muted mt-1 text-sm leading-6">{formatNumber(composerTotalPoints)} Punkte in {composerTaskCount} Aufgaben werden als bearbeitbarer EWH angelegt.</p></div>
                  <button type="button" className="icon-button" title="Vorschau schließen" onClick={() => setComposerReviewOpen(false)}>×</button>
                </div>
                {renderTargetControls()}
                <div className="composer-review-meta">
                  <p className="label">Rahmendaten</p>
                  <ExamHeaderForm meta={metaDraft} showNotesListTransform={false} onChange={(key, value) => setMetaDraft((current) => ({ ...current, [key]: value }))} />
                </div>
                <div className="composer-review-actions"><button type="button" className="button-secondary" onClick={() => setComposerReviewOpen(false)}>Zurück zum Aufbau</button><button type="button" className="button-primary" disabled={!canSubmitCurrentMode} onClick={submitCurrentMode}>EWH erstellen</button></div>
              </section>
            </div>
          ) : null}
        </div>
        <DragOverlay dropAnimation={null}>{draggedTaskTitle ? <div className="composer-drag-overlay"><DragIcon />{draggedTaskTitle}</div> : null}</DragOverlay>
      </DndContext>
    );
  };

  return (
    <Card className="template-decision-shell">
      <div className="template-decision-header">
        <div>
          <p className="label">Schnellentscheidung</p>
          <h2 className="themed-strong mt-2 text-2xl font-semibold">Erwartungshorizont erstellen</h2>
          <p className="themed-muted mt-2 max-w-3xl text-sm leading-6">
            Starte mit einer Vorlage, einer PDF oder einer leeren Struktur. Die passende Grundlage landet sofort im
            EWH-Editor und kann dort weiter angepasst werden. Vor dem Einsatz bitte mit den aktuellen Vorgaben der
            Standardsicherung NRW abgleichen.
          </p>
        </div>
        <div className="template-decision-count">
          <strong>{templates.length}</strong>
          <span>Vorlagen</span>
        </div>
      </div>

      {!isComposerOpen ? (
        <div className="template-mode-tabs">
          {renderModeButton("templates", "Vorlagen", "Suchen und übernehmen")}
          {renderModeButton("manual", "Leere Struktur", "Frei zusammenstellen")}
          <button
            type="button"
            className="template-create-button button-primary gap-2"
            disabled
            title="Wähle zuerst eine Vorlage für die Zusammenstellung."
          >
            <span className="inline-flex items-center gap-2"><PlusIcon />Vorlage wählen</span>
            <ChevronRightIcon />
          </button>
        </div>
      ) : null}

      {isComposerOpen ? renderComposer() : null}

      {mode === "templates" && !isComposerOpen && (
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
              {(query || subjectFilter !== "all" || stageFilter !== "all" || schoolFormFilter !== "all" || focusFilter !== "all") && (
                <button type="button" onClick={resetFilters}>
                  Zurücksetzen
                </button>
              )}
            </div>

            <label className="template-subject-filter">
              <span className="label">Fach</span>
              <select className="field" value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}>
                <option value="all">Alle Fächer</option>
                {availableSubjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
              </select>
            </label>

            <div className="template-filter-row" aria-label="Schulformfilter">
              {[
                ["all", "Alle Schulformen"],
                ["grundschule", "Grundschule"],
                ["realschule", "Realschule"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`template-filter-chip ${schoolFormFilter === value ? "template-filter-chip-active" : ""}`}
                  onClick={() => setSchoolFormFilter(value as SchoolFormFilter)}
                >
                  {label}
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
                ["abitur", "Vorabitur"],
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
                    <span className="template-badge">{schoolFormLabel(selectedTemplate.schoolForm)}</span>
                    <span className="template-badge">{focusLabel(selectedTemplate.focus)}</span>
                  </div>
                  <h3 className="themed-strong text-xl font-semibold">{selectedTemplate.title}</h3>
                  <p className="themed-muted mt-2 text-sm leading-6">{selectedTemplate.pedagogicalHint}</p>
                  {selectedTemplate.standardsNote ? (
                    <div className="template-standards-note">
                      <InfoIcon className="h-4 w-4" />
                      <p>{selectedTemplate.standardsNote}</p>
                    </div>
                  ) : null}
                </div>

                <TemplateAllocationChart
                  sections={selectedTemplate.previewSections.map((section, index) => ({
                    title: section.title,
                    tasks: section.tasks,
                    points: selectedTemplatePoints[index] ?? section.points,
                  }))}
                  totalPoints={selectedTemplateTotalPoints}
                  activeIndex={activeTemplateSectionIndex}
                  onActiveIndexChange={setActiveTemplateSectionIndex}
                  onPointChange={updateTemplateSectionPoint}
                />

                <div className="template-quick-settings">
                  <Field label="Zielpunktzahl">
                    <NumberInput className="field" value={totalPoints} min={1} step={0.5} onCommit={updateTotalPoints} />
                  </Field>
                  {renderTargetControls()}
                  {renderMetaSummary()}
                  <button type="button" className="button-primary gap-2" onClick={() => openComposer(selectedTemplate)}><DragIcon />Klausur zusammenstellen</button>
                </div>

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

      {mode === "manual" && !isComposerOpen && (
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
                  Summe: <strong>{formatNumber(sectionPointSum)}</strong> / {formatNumber(totalPoints)} Punkte
                </p>
              </div>
              <button type="button" className="button-secondary px-3 py-2 text-xs" onClick={applyManualPreset}>
                Vorschlag laden
              </button>
            </div>

            {difference !== 0 && (
              <p className="warning-note text-xs">
                Noch {difference > 0 ? formatNumber(difference) : formatNumber(Math.abs(difference))} Punkte{" "}
                {difference > 0 ? "zu verteilen" : "zu viel vergeben"}.
              </p>
            )}

            <div className="space-y-4">
              {sectionDrafts.map((section, index) => (
                <div key={section.id} className="template-manual-section">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="themed-strong text-sm font-semibold">{getPartLabel(index)}</p>
                    <span className="label">{formatNumber(section.points)} Punkte</span>
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
                    <Field label="Punkte">
                      <NumberInput
                        className="field"
                        value={section.points}
                        min={0}
                        step={0.5}
                        onCommit={(value) =>
                          setSectionDrafts((current) =>
                            current.map((entry) => (entry.id === section.id ? { ...entry, points: value } : entry)),
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

          </section>
          {renderMetaEditor()}
        </div>
      )}
    </Card>
  );
};
