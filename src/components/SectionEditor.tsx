import { DragEvent as ReactDragEvent } from "react";
import { Section, Task } from "../types";
import { calculateSectionResult } from "../utils/calculations";
import { formatNumber } from "../utils/format";
import { getWritingLanguageMetrics } from "../utils/writing";
import { ChevronDownIcon, ChevronRightIcon, DragIcon, DuplicateIcon, LinkIcon, TrashIcon, UnlinkIcon } from "./icons";
import { Badge, Card, Field, IconButton, NumberInput, TextAreaField } from "./ui";
import { getEditorTaskAnchorId } from "./EditorToc";
import { TaskTable } from "./TaskTable";

const SECTION_TONES = {
  A: {
    cardClass: "section-editor section-editor--a",
    badgeClass: "section-editor-badge",
    ringClass: "ring-2 ring-sky-300/70",
  },
  B: {
    cardClass: "section-editor section-editor--b",
    badgeClass: "section-editor-badge",
    ringClass: "ring-2 ring-teal-300/70",
  },
  C: {
    cardClass: "section-editor section-editor--c",
    badgeClass: "section-editor-badge",
    ringClass: "ring-2 ring-amber-300/70",
  },
  D: {
    cardClass: "section-editor section-editor--d",
    badgeClass: "section-editor-badge",
    ringClass: "ring-2 ring-rose-300/70",
  },
} as const;

const getSectionToneKey = (title: string, index: number): keyof typeof SECTION_TONES => {
  const match = title.match(/(?:section|teil)\s+([a-d])/i);
  if (match) return match[1].toUpperCase() as keyof typeof SECTION_TONES;

  return (["A", "B", "C", "D"] as const)[index % 4];
};

interface Props {
  section: Section;
  index: number;
  totalMaxPoints: number;
  scoresLocked?: boolean;
  draggable?: boolean;
  isDragging?: boolean;
  collapsed?: boolean;
  dropIndicatorPosition?: "before" | "after" | null;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragOver?: (targetSectionId: string, position: "before" | "after") => void;
  onDrop?: (targetSectionId: string, position: "before" | "after") => void;
  onChange: (patch: Partial<Section>) => void;
  onTotalPointsChange: (value: number) => void;
  onToggleCollapse: () => void;
  onTaskChange: (taskId: string, patch: Partial<Task>) => void;
  onAddTask: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: (direction: "up" | "down") => void;
  linkedSectionTitle?: string | null;
  linkTargetTitle?: string | null;
  onToggleLink?: () => void;
  onDeleteTask: (taskId: string) => void;
  onDuplicateTask: (taskId: string) => void;
  onMoveTask: (taskId: string, direction: "up" | "down") => void;
}

export const SectionEditor = ({
  section,
  index,
  totalMaxPoints,
  scoresLocked = false,
  draggable,
  isDragging,
  collapsed,
  dropIndicatorPosition,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onChange,
  onTotalPointsChange,
  onToggleCollapse,
  onTaskChange,
  onAddTask,
  onDelete,
  onDuplicate,
  onMove,
  linkedSectionTitle,
  linkTargetTitle,
  onToggleLink,
  onDeleteTask,
  onDuplicateTask,
  onMoveTask,
}: Props) => {
  const result = calculateSectionResult(section);
  const writingMetrics = getWritingLanguageMetrics(section);
  const tone = SECTION_TONES[getSectionToneKey(section.title, index)];
  const shareOfTotalPoints = totalMaxPoints > 0 ? (result.maxPoints / totalMaxPoints) * 100 : 0;
  const handleDragPosition = (event: ReactDragEvent<HTMLDivElement>) =>
    event.clientY < event.currentTarget.getBoundingClientRect().top + event.currentTarget.getBoundingClientRect().height / 2
      ? "before"
      : "after";
  const showBeforeIndicator = dropIndicatorPosition === "before";
  const showAfterIndicator = dropIndicatorPosition === "after";

  return (
    <div
      className={`space-y-2 transition-[opacity,transform] duration-200 ${isDragging ? "opacity-70" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver?.(section.id, handleDragPosition(event));
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop?.(section.id, handleDragPosition(event));
      }}
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none overflow-hidden rounded-full transition-all duration-200 ${
          showBeforeIndicator ? "max-h-8 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex items-center gap-3 px-2 py-1">
          <span className="section-insert-line h-px flex-1" />
          <span className="section-insert-chip inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold leading-none uppercase tracking-[0.18em] shadow-sm">
            Einfügen
          </span>
          <span className="section-insert-line h-px flex-1" />
        </div>
      </div>
      <Card
        title={`${index + 1}. ${section.title || "Neuer Aufgabenteil"}`}
        subtitle={section.description}
        actions={
          <div className="control-cluster inline-flex flex-wrap items-center gap-1 rounded-full border p-1 shadow-sm sm:flex-nowrap">
            <IconButton onClick={onToggleCollapse} title={collapsed ? "Aufklappen" : "Zuklappen"} className="px-2.5 py-2 text-xs">
              {collapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
            </IconButton>
            <IconButton onClick={() => onMove("up")} title="Aufgabenteil nach oben" className="px-2.5 py-2 text-xs">
              ↑
            </IconButton>
            <IconButton onClick={() => onMove("down")} title="Aufgabenteil nach unten" className="px-2.5 py-2 text-xs">
              ↓
            </IconButton>
            <IconButton onClick={onDuplicate} title="Aufgabenteil duplizieren" className="px-2.5 py-2 text-xs">
              <DuplicateIcon />
            </IconButton>
            {(linkedSectionTitle || linkTargetTitle) && (
              <IconButton
                onClick={() => onToggleLink?.()}
                title={
                  linkedSectionTitle
                    ? `Verknüpfung mit ${linkedSectionTitle} lösen`
                    : `Mit ${linkTargetTitle} verknüpfen`
                }
                className="px-2.5 py-2 text-xs"
              >
                {linkedSectionTitle ? <UnlinkIcon /> : <LinkIcon />}
              </IconButton>
            )}
            <IconButton onClick={onDelete} title="Aufgabenteil löschen" variant="soft" className="px-2.5 py-2 text-xs">
              <TrashIcon />
            </IconButton>
          </div>
        }
        className={`${tone.cardClass} ${isDragging ? tone.ringClass : ""}`}
      >
        <div className="mb-5 flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${tone.badgeClass}`}>
            Teil {getSectionToneKey(section.title, index)}
          </span>
          <span
            draggable={draggable}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className="themed-muted inline-flex cursor-grab items-center gap-1.5 rounded-full border border-dashed px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
            style={{ borderColor: "var(--app-secondary-border)" }}
            title="Aufgabenteil ziehen"
          >
            <DragIcon className="h-3.5 w-3.5" />
            Ziehen
          </span>
          {writingMetrics && (
            <Badge tone={writingMetrics.isCompliant ? "emerald" : "amber"}>
              Sprache {formatNumber(writingMetrics.languageShare)} % von {formatNumber(writingMetrics.totalPoints)} P.
            </Badge>
          )}
          {linkedSectionTitle && <Badge tone="slate">Verknüpft mit {linkedSectionTitle}</Badge>}
          <Badge tone="amber">{formatNumber(result.percentage)} %</Badge>
          <Badge tone="slate">{formatNumber(result.achievedPoints)} / {formatNumber(result.maxPoints)} P.</Badge>
          {collapsed && (
            <span className="themed-muted w-full text-xs font-medium sm:ml-auto sm:w-auto">
              {section.tasks.length} Unteraufgaben
            </span>
          )}
        </div>
        {!collapsed && (
          <>
        <div className="mb-4 grid gap-3 lg:grid-cols-3">
          <Field label="Titel">
            <input className="field" value={section.title} onChange={(e) => onChange({ title: e.target.value })} />
          </Field>
          <Field label="Kurzbeschreibung">
            <input
              className="field"
              value={section.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Kurze Erklärung"
            />
          </Field>
          <Field label={`Max. Punkte Abschnitt · ${formatNumber(shareOfTotalPoints)} % der Gesamtpunkte`}>
            <NumberInput
              className="field"
              min={0}
              step={0.5}
              value={result.maxPoints}
              onCommit={onTotalPointsChange}
            />
          </Field>
        </div>
        <div className="mb-4 grid gap-3 lg:grid-cols-2">
          <Field label="Notiz / Erwartungshorizont">
            <TextAreaField
              className="min-h-24 !px-3 !py-2.5 text-sm"
              value={section.note}
              showListTransform
              onValueChange={(value) => onChange({ note: value })}
              placeholder="Hinweise, Bewertungsraster, Erwartungshorizont"
            />
          </Field>
          <div className={`surface-muted grid gap-2 rounded-3xl p-4 ${writingMetrics ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
            <div>
              <p className="label">Maximalpunkte</p>
              <p className="themed-strong text-xl font-semibold">{formatNumber(result.maxPoints)}</p>
            </div>
            <div>
              <p className="label">Erreicht</p>
              <p className="themed-strong text-xl font-semibold">{scoresLocked ? "Gesperrt" : formatNumber(result.achievedPoints)}</p>
            </div>
            <div>
              <p className="label">Ergebnis</p>
              <p className="themed-strong text-xl font-semibold">{scoresLocked ? "Gesperrt" : `${formatNumber(result.percentage)} %`}</p>
            </div>
            {writingMetrics && (
              <div>
                <p className="label">Sprach-Ziel</p>
                <p className="themed-strong text-xl font-semibold">
                  {formatNumber(writingMetrics.targetLanguagePoints)} / {formatNumber(writingMetrics.totalPoints)} P.
                </p>
              </div>
            )}
          </div>
        </div>
        <TaskTable
          tasks={section.tasks}
          scoresLocked={scoresLocked}
          getTaskAnchorId={(task) => getEditorTaskAnchorId(section.id, task.id)}
          onChange={onTaskChange}
          onAdd={onAddTask}
          onDelete={onDeleteTask}
          onDuplicate={onDuplicateTask}
          onMove={onMoveTask}
        />
          </>
        )}
      </Card>
      <div
        aria-hidden="true"
        className={`pointer-events-none overflow-hidden rounded-full transition-all duration-200 ${
          showAfterIndicator ? "max-h-8 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex items-center gap-3 px-2 py-1">
          <span className="section-insert-line h-px flex-1" />
          <span className="section-insert-chip inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold leading-none uppercase tracking-[0.18em] shadow-sm">
            Einfügen
          </span>
          <span className="section-insert-line h-px flex-1" />
        </div>
      </div>
    </div>
  );
};
