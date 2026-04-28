import { DragEvent as ReactDragEvent } from "react";
import { Section, Task } from "../types";
import { calculateSectionResult } from "../utils/calculations";
import { formatNumber } from "../utils/format";
import { getSectionRecommendation } from "../utils/sectionWeights";
import { getWritingLanguageMetrics } from "../utils/writing";
import { ChevronDownIcon, ChevronRightIcon, DragIcon, DuplicateIcon, LinkIcon, TrashIcon, UnlinkIcon } from "./icons";
import { Badge, Card, DismissibleCallout, Field, IconButton, NumberInput, TextAreaField } from "./ui";
import { TaskTable } from "./TaskTable";

const SECTION_TONES = {
  A: {
    cardClass:
      "border-sky-200/90 bg-[linear-gradient(180deg,rgba(240,249,255,0.94),rgba(255,255,255,0.80))] dark:border-sky-900/70 dark:bg-[linear-gradient(180deg,rgba(8,47,73,0.34),rgba(15,23,42,0.84))]",
    badgeClass:
      "bg-sky-100 text-sky-800 ring-1 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-200 dark:ring-sky-500/20",
    ringClass: "ring-2 ring-sky-300/70",
  },
  B: {
    cardClass:
      "border-teal-200/90 bg-[linear-gradient(180deg,rgba(240,253,250,0.94),rgba(255,255,255,0.80))] dark:border-teal-900/70 dark:bg-[linear-gradient(180deg,rgba(4,47,46,0.34),rgba(15,23,42,0.84))]",
    badgeClass:
      "bg-teal-100 text-teal-800 ring-1 ring-teal-200 dark:bg-teal-500/15 dark:text-teal-200 dark:ring-teal-500/20",
    ringClass: "ring-2 ring-teal-300/70",
  },
  C: {
    cardClass:
      "border-amber-200/90 bg-[linear-gradient(180deg,rgba(255,251,235,0.94),rgba(255,255,255,0.80))] dark:border-amber-900/70 dark:bg-[linear-gradient(180deg,rgba(69,26,3,0.32),rgba(15,23,42,0.84))]",
    badgeClass:
      "bg-amber-100 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-500/20",
    ringClass: "ring-2 ring-amber-300/70",
  },
  D: {
    cardClass:
      "border-rose-200/90 bg-[linear-gradient(180deg,rgba(255,241,242,0.94),rgba(255,255,255,0.80))] dark:border-rose-900/70 dark:bg-[linear-gradient(180deg,rgba(76,5,25,0.32),rgba(15,23,42,0.84))]",
    badgeClass:
      "bg-rose-100 text-rose-800 ring-1 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-200 dark:ring-rose-500/20",
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
  scoresLocked?: boolean;
  targetPointsFromWeight?: number | null;
  draggable?: boolean;
  isDragging?: boolean;
  collapsed?: boolean;
  dropIndicatorPosition?: "before" | "after" | null;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragOver?: (targetSectionId: string, position: "before" | "after") => void;
  onDrop?: (targetSectionId: string, position: "before" | "after") => void;
  onChange: (patch: Partial<Section>) => void;
  onWeightChange: (value: number) => void;
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
  scoresLocked = false,
  targetPointsFromWeight,
  draggable,
  isDragging,
  collapsed,
  dropIndicatorPosition,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onChange,
  onWeightChange,
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
  const recommendation = getSectionRecommendation(section);
  const tone = SECTION_TONES[getSectionToneKey(section.title, index)];
  const pointDelta = targetPointsFromWeight == null ? null : result.maxPoints - targetPointsFromWeight;
  const hasPointWeightMismatch = pointDelta != null && Math.abs(pointDelta) > 0.05;
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
          <span className="section-insert-chip rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] shadow-sm">
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
        <div className="mb-4 grid gap-3 lg:grid-cols-4">
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
          <Field label="Gewichtung in %">
            <NumberInput
              className="field"
              min={0}
              step={0.5}
              value={section.weight}
              onCommit={onWeightChange}
            />
          </Field>
          <Field label="Max. Punkte Abschnitt">
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
        {targetPointsFromWeight != null && (
          <div className="mb-4">
          <DismissibleCallout
            tone={hasPointWeightMismatch ? (pointDelta != null && pointDelta > 0 ? "danger" : "warning") : "success"}
            resetKey={[
              section.id,
              formatNumber(section.weight),
              formatNumber(result.maxPoints),
              formatNumber(targetPointsFromWeight),
              hasPointWeightMismatch ? "mismatch" : "aligned",
            ].join("|")}
          >
            Ziel bei <strong>{formatNumber(section.weight)} %</strong>:{" "}
            <strong>{formatNumber(targetPointsFromWeight)} Punkte</strong>.
            {hasPointWeightMismatch ? (
              <>
                {" "}Aktuell liegt der Abschnitt{" "}
                <strong>{formatNumber(Math.abs(pointDelta ?? 0))} Punkte</strong>{" "}
                {pointDelta != null && pointDelta > 0 ? "über" : "unter"} dem Ziel.
              </>
            ) : (
              <> Die Punktzahl passt.</>
            )}
          </DismissibleCallout>
          </div>
        )}
        {recommendation && (
          <div className="surface-elevated mb-5 rounded-2xl border px-4 py-3 text-sm">
            Empfehlung: {recommendation.label} · {recommendation.min}-{recommendation.max} % · typisch {recommendation.typical} %
          </div>
        )}
        <TaskTable
          tasks={section.tasks}
          scoresLocked={scoresLocked}
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
          <span className="section-insert-chip rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] shadow-sm">
            Einfügen
          </span>
          <span className="section-insert-line h-px flex-1" />
        </div>
      </div>
    </div>
  );
};
