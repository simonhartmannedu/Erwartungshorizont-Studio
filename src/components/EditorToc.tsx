import { useEffect, useMemo, useState } from "react";
import type { MouseEvent } from "react";
import type { Section } from "../types";
import { calculateSectionResult } from "../utils/calculations";
import { formatNumber } from "../utils/format";
import { ListIcon } from "./icons";

export const EDITOR_METADATA_ANCHOR_ID = "ewh-editor-metadata";
export const EDITOR_POINTS_ANCHOR_ID = "ewh-editor-points-grade";
export const EDITOR_POINT_SCALING_ANCHOR_ID = "ewh-editor-point-scaling";
export const EDITOR_GRADE_SCALE_ANCHOR_ID = "ewh-editor-grade-scale";
export const EDITOR_GRADE_RANGES_ANCHOR_ID = "ewh-editor-grade-ranges";
export const EDITOR_RESULT_ANCHOR_ID = "ewh-editor-result";

export const getEditorSectionAnchorId = (sectionId: string) => `ewh-editor-section-${sectionId}`;
export const getEditorTaskAnchorId = (sectionId: string, taskId: string) => `ewh-editor-task-${sectionId}-${taskId}`;

const TASK_TOC_THRESHOLD = 8;

interface EditorTocItem {
  id: string;
  label: string;
  meta?: string;
  children?: EditorTocItem[];
}

const flattenItems = (items: EditorTocItem[]): EditorTocItem[] =>
  items.flatMap((item) => [item, ...(item.children ? flattenItems(item.children) : [])]);

const isVisibleAnchor = (element: HTMLElement) => element.getClientRects().length > 0;

const getAnchorElement = (id: string) => {
  const elementById = document.getElementById(id);
  if (elementById && isVisibleAnchor(elementById)) return elementById;

  return Array.from(document.querySelectorAll<HTMLElement>(`[data-editor-anchor="${CSS.escape(id)}"]`)).find(isVisibleAnchor) ?? null;
};

export const EditorToc = ({
  sections,
  showPointSubsections,
}: {
  sections: Section[];
  showPointSubsections: boolean;
}) => {
  const items = useMemo<EditorTocItem[]>(() => [
    { id: EDITOR_METADATA_ANCHOR_ID, label: "Metadaten" },
    {
      id: EDITOR_POINTS_ANCHOR_ID,
      label: "Punkte und Note",
      children: showPointSubsections
        ? [
            { id: EDITOR_POINT_SCALING_ANCHOR_ID, label: "Gesamtpunktzahl skalieren" },
            { id: EDITOR_GRADE_SCALE_ANCHOR_ID, label: "Notenschlüssel bearbeiten" },
            { id: EDITOR_GRADE_RANGES_ANCHOR_ID, label: "Notenbereiche" },
          ]
        : undefined,
    },
    ...sections.map((section, index) => {
      const result = calculateSectionResult(section);
      const taskCount = section.tasks.length;

      return {
        id: getEditorSectionAnchorId(section.id),
        label: section.title.trim() || `Abschnitt ${index + 1}`,
        meta: `${taskCount} ${taskCount === 1 ? "Aufgabe" : "Aufgaben"} · ${formatNumber(result.maxPoints)} P.`,
        children: taskCount >= TASK_TOC_THRESHOLD
          ? section.tasks.map((task, taskIndex) => ({
              id: getEditorTaskAnchorId(section.id, task.id),
              label: task.title.trim() || `Aufgabe ${taskIndex + 1}`,
              meta: `${formatNumber(task.maxPoints)} P.`,
            }))
          : undefined,
      };
    }),
    { id: EDITOR_RESULT_ANCHOR_ID, label: "Ergebnis und Abschlussbereich" },
  ], [sections, showPointSubsections]);

  const flatItems = useMemo(() => flattenItems(items), [items]);
  const [activeId, setActiveId] = useState(flatItems[0]?.id ?? "");

  useEffect(() => {
    const updateActiveItem = () => {
      const anchors = flatItems
        .map((item) => ({ id: item.id, element: getAnchorElement(item.id) }))
        .filter((entry): entry is { id: string; element: HTMLElement } => entry.element !== null);

      if (anchors.length === 0) return;

      const activeAnchor = anchors.reduce((current, entry) => {
        const top = entry.element.getBoundingClientRect().top;
        return top <= 150 ? entry : current;
      }, anchors[0]);

      setActiveId(activeAnchor.id);
    };

    updateActiveItem();
    window.addEventListener("scroll", updateActiveItem, { passive: true });
    window.addEventListener("resize", updateActiveItem);

    return () => {
      window.removeEventListener("scroll", updateActiveItem);
      window.removeEventListener("resize", updateActiveItem);
    };
  }, [flatItems]);

  const scrollToItem = (id: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById(id);
    const logicalTarget = getAnchorElement(id);
    if (!logicalTarget && !target) return;

    event.preventDefault();
    (logicalTarget ?? target)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const renderItems = (tocItems: EditorTocItem[], level = 0, parentNumber = "") => (
    <ul className={level === 0 ? "space-y-1.5" : "mt-1 space-y-1 border-l pl-3"}>
      {tocItems.map((item, index) => {
        const itemNumber = parentNumber ? `${parentNumber}.${index + 1}` : `${index + 1}`;

        return (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={scrollToItem(item.id)}
              className={`editor-toc-link ${activeId === item.id ? "editor-toc-link-active" : ""} ${
                level > 0 ? "editor-toc-link-child" : ""
              }`}
            >
              <span className="editor-toc-number">{itemNumber}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{item.label}</span>
                {item.meta ? <span className="editor-toc-meta block truncate">{item.meta}</span> : null}
              </span>
            </a>
            {item.children ? renderItems(item.children, level + 1, itemNumber) : null}
          </li>
        );
      })}
    </ul>
  );

  return (
    <nav className="editor-toc panel no-print p-4" aria-label="Inhaltsverzeichnis EWH-Editor">
      <div className="mb-3 flex items-center gap-2">
        <span className="editor-toc-icon inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl">
          <ListIcon />
        </span>
        <div className="min-w-0">
          <h2 className="card-title text-sm font-semibold">Inhalt</h2>
          <p className="card-subtitle text-xs">EWH-Editor</p>
        </div>
      </div>
      {renderItems(items)}
    </nav>
  );
};
