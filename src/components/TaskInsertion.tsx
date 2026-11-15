import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { ExamTemplateDefinition } from "../data/templates";
import type { Task } from "../types";
import { SearchIcon } from "./icons";
import { createLocalSearchIndex, searchLocalIndex } from "../utils/localSearch";
import { formatNumber } from "../utils/format";
import { copyTaskForInsertion, describeInsertionTarget, resolveInsertionPosition, type InsertionSection, type InsertionTarget } from "../utils/taskInsertion";

type OpenInsertion = { target: InsertionTarget; trigger: HTMLButtonElement; touch: boolean };
type InsertionContext = { open: (value: OpenInsertion) => void; target: InsertionTarget | null; mode: "builder" | "editor"; describe: (target: InsertionTarget) => string };
const Context = createContext<InsertionContext | null>(null);

export const InsertionPoint = ({ target, empty = false }: { target: InsertionTarget; empty?: boolean }) => {
  const context = useContext(Context);
  const touch = useRef(false);
  if (!context) return null;
  const active = JSON.stringify(context.target) === JSON.stringify(target);
  const label = context.mode === "builder" ? "Baustein einfügen" : "Unteraufgabe ergänzen";
  return <div className={`task-insertion-point no-print ${empty ? "is-empty" : ""} ${active ? "is-active" : ""}`}>
    <button type="button" className="task-insertion-trigger" aria-label={label} aria-haspopup="dialog" aria-expanded={active} aria-description={context.describe(target)} title={`${label}: ${context.describe(target)}`}
      onPointerDown={(event) => { touch.current = event.pointerType === "touch" || event.pointerType === "pen"; }}
      onKeyDown={() => { touch.current = false; }}
      onClick={(event) => context.open({ target, trigger: event.currentTarget, touch: touch.current })}>
      <span aria-hidden="true" className="task-insertion-plus">+</span>{empty ? <span>{label}</span> : null}
    </button>
    <span aria-hidden="true" className="task-insertion-line" />
  </div>;
};

interface Props {
  children: ReactNode;
  mode: "builder" | "editor";
  sections: InsertionSection[];
  templates: ExamTemplateDefinition[] | null;
  selectedTemplateId?: string | null;
  subject?: string;
  createBlankTask?: () => Task;
  getConfirmation?: (target: InsertionTarget, task: Task) => string | null;
  onInsert: (target: InsertionTarget, task: Task) => boolean;
  onUndo: (taskId: string) => boolean;
  canUndo?: (taskId: string) => boolean;
}

/** Shared compact picker and full library; the caller owns all persistence. */
export const TaskInsertion = ({ children, mode, sections, templates, selectedTemplateId, subject = "", createBlankTask, getConfirmation, onInsert, onUndo, canUndo }: Props) => {
  const [opened, setOpened] = useState<OpenInsertion | null>(null);
  const [library, setLibrary] = useState(false);
  const [query, setQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState(subject || "all");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [pending, setPending] = useState<{ task: Task; blank: boolean } | null>(null);
  const [notice, setNotice] = useState("");
  const [insertedId, setInsertedId] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState({ left: 12, top: 12 });
  const items = useMemo(() => (templates ?? []).flatMap((template) => template.build().sections.flatMap((section, sectionIndex) =>
    section.tasks.map((task, index) => ({ id: `${template.id}:${sectionIndex}:${index}`, templateId: template.id,
      subject: template.subject, templateTitle: template.shortLabel, sectionTitle: section.title, task })))), [templates]);
  const currentSection = sections.find((section) => section.id === opened?.target.sectionId);
  const suggestions = items.filter((item) => item.templateId === selectedTemplateId)
    .sort((a, b) => Number(b.sectionTitle === currentSection?.title) - Number(a.sectionTitle === currentSection?.title)).slice(0, 3);
  const searchIndex = useMemo(() => createLocalSearchIndex(items, (item) => [
    { text: item.task.title, weight: 10 },
    { text: `${item.subject} ${item.templateTitle} ${item.sectionTitle}`, weight: 4 },
    { text: `${item.task.description} ${item.task.expectation} ${item.task.maxPoints} Punkte`, weight: 2 },
  ]), [items]);
  const filteredItems = useMemo(() => searchLocalIndex(searchIndex, query).map((entry) => entry.item).filter((item) =>
    (subjectFilter === "all" || item.subject === subjectFilter) && (templateFilter === "all" || item.templateId === templateFilter)),
  [searchIndex, query, subjectFilter, templateFilter]);
  const close = (restoreFocus = true) => {
    const trigger = opened?.trigger;
    setOpened(null); setPending(null);
    if (restoreFocus) requestAnimationFrame(() => trigger?.isConnected && trigger.focus({ preventScroll: true }));
  };
  useLayoutEffect(() => {
    if (!opened) return;
    const position = () => {
      const anchor = opened.trigger.getBoundingClientRect();
      const rect = panel.current?.getBoundingClientRect();
      const width = rect?.width ?? 360;
      const height = rect?.height ?? 260;
      const below = anchor.bottom + 4;
      setPlacement({ left: Math.max(12, Math.min(anchor.left, window.innerWidth - width - 12)),
        top: Math.max(12, below + height <= window.innerHeight - 12 ? below : anchor.top - height - 4) });
    };
    position();
    const observer = new ResizeObserver(position);
    if (panel.current) observer.observe(panel.current);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => { observer.disconnect(); window.removeEventListener("resize", position); window.removeEventListener("scroll", position, true); };
  }, [opened, library, pending]);
  useEffect(() => {
    if (!opened) return;
    // Focus a button, never the search field: opening the drawer must not summon a keyboard.
    panel.current?.querySelector<HTMLButtonElement>(pending ? ".task-insertion-cancel" : library ? ".task-insertion-heading button" : ".task-insertion-option")?.focus({ preventScroll: true });
  }, [opened, library, pending]);
  useEffect(() => {
    if (!opened) return;
    const outside = (event: PointerEvent) => {
      const element = event.target as Node;
      if (!panel.current?.contains(element) && !opened.trigger.contains(element) && !(element instanceof Element && element.closest(".task-insertion-trigger"))) close();
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  });
  const commit = (task: Task, blank: boolean) => {
    if (!opened) return;
    if (!resolveInsertionPosition(sections, opened.target) || !onInsert(opened.target, task)) {
      setNotice("Die Einfügestelle ist nicht mehr vorhanden. Bitte wähle die Stelle erneut.");
      setInsertedId(null);
      close(); return;
    }
    const touch = opened.touch;
    close(false); setInsertedId(task.id); setNotice(mode === "builder" ? "Baustein eingefügt." : "Unteraufgabe eingefügt.");
    requestAnimationFrame(() => {
      const row = Array.from(document.querySelectorAll<HTMLElement>("[data-insertion-task-id]"))
        .find((element) => element.dataset.insertionTaskId === task.id && element.getClientRects().length > 0);
      row?.scrollIntoView({ block: "nearest", behavior: "auto" });
      row?.classList.add("task-just-inserted");
      window.setTimeout(() => row?.classList.remove("task-just-inserted"), 2200);
      if (row && !touch) { row.tabIndex = -1; row.focus({ preventScroll: true }); }
      if (blank && !touch) { const input = row?.querySelector<HTMLInputElement>("input[data-task-title]"); input?.focus(); input?.select(); }
    });
  };
  const choose = (source: Task | null) => {
    if (!opened) return;
    const task = source ? copyTaskForInsertion(source, currentSection?.title ?? source.category) : createBlankTask?.();
    if (!task) return;
    if (getConfirmation?.(opened.target, task)) setPending({ task, blank: !source });
    else commit(task, !source);
  };
  const destination = opened ? describeInsertionTarget(sections, opened.target) : "";
  return <Context.Provider value={{ mode, target: opened?.target ?? null, describe: (target) => describeInsertionTarget(sections, target), open: (value) => {
    setOpened(value); setLibrary(false); setPending(null); setSubjectFilter(items.some((item) => item.subject === subject) ? subject : "all"); setTemplateFilter("all"); setQuery("");
  } }}>
    {children}
    {notice ? <div className="task-insertion-notice no-print" role="status"><span>{notice}</span>
      {insertedId && sections.some((section) => section.tasks.some((task) => task.id === insertedId)) && (!canUndo || canUndo(insertedId)) ? <button type="button" className="button-secondary" onClick={() => {
        if (onUndo(insertedId)) { setInsertedId(null); setNotice("Einfügen rückgängig gemacht."); }
        else { setInsertedId(null); setNotice("Die Aufgabe wurde inzwischen bewertet oder verknüpft. Rückgängig ist nicht mehr verfügbar."); }
      }}>Rückgängig</button> : null}
      <button type="button" className="icon-button" aria-label="Hinweis schließen" onClick={() => setNotice("")}>×</button>
    </div> : null}
    {opened ? createPortal(<div className="task-insertion-layer no-print">
      <div className="task-insertion-shade" onClick={() => close()} />
      <div ref={panel} className={`task-insertion-menu ${library ? "is-library" : ""}`} style={placement}
        role="dialog" aria-modal="true" aria-label={pending ? "Gemeinsame Rubrik ändern" : library ? "Alle Bausteine durchsuchen" : "Aufgabe einfügen"}
        onKeyDown={(event) => {
          if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); }
          const controls = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, [tabindex="0"]') ?? []);
          const index = controls.indexOf(document.activeElement as HTMLElement);
          if (event.key === "Tab" && controls.length && ((event.shiftKey && index <= 0) || (!event.shiftKey && index === controls.length - 1))) {
            event.preventDefault(); controls[event.shiftKey ? controls.length - 1 : 0]?.focus();
          }
          if (!library && ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
            event.preventDefault(); controls[event.key === "Home" ? 0 : event.key === "End" ? controls.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + controls.length) % controls.length]?.focus();
          }
        }}>
        <div className="task-insertion-heading"><p>{destination}</p><button type="button" className="icon-button task-insertion-cancel" aria-label="Abbrechen" onClick={() => close()}>×</button></div>
        {pending ? <div className="task-insertion-confirm"><strong>Gemeinsame Rubrik ändern?</strong>
          <p>{getConfirmation?.(opened.target, pending.task)}</p><div className="flex flex-wrap gap-2">
            <button type="button" className="button-secondary task-insertion-cancel" onClick={() => close()}>Abbrechen</button>
            <button type="button" className="button-primary" onClick={() => commit(pending.task, pending.blank)}>Unteraufgabe einfügen</button>
          </div></div> : library ? <>
          <div className="task-library-filters">
            <input className="field" aria-label="Aufgaben durchsuchen" placeholder="Begriffe oder Titel suchen …" aria-describedby="task-library-search-help" value={query} onChange={(event) => setQuery(event.target.value)} />
            <select className="field" aria-label="Fach für Aufgaben filtern" value={subjectFilter} onChange={(event) => { setSubjectFilter(event.target.value); setTemplateFilter("all"); }}>
              <option value="all">Alle Fächer</option>{Array.from(new Set(items.map((item) => item.subject))).sort().map((value) => <option key={value}>{value}</option>)}
            </select>
            <select className="field" aria-label="Vorlage für Aufgaben filtern" value={templateFilter} onChange={(event) => setTemplateFilter(event.target.value)}>
              <option value="all">Alle Vorlagen</option>{(templates ?? []).filter((template) => subjectFilter === "all" || template.subject === subjectFilter).map((template) => <option key={template.id} value={template.id}>{template.shortLabel}</option>)}
            </select>
          </div>
          <p id="task-library-search-help" className="themed-muted px-3 py-2 text-xs">Auch Wortanfänge und Tippfehler · &quot;Wortgruppe&quot; in Anführungszeichen · -Begriff ausschließen</p>
          <div className="task-library-results" aria-label={`${filteredItems.length} Bausteine gefunden`}>{filteredItems.map((item) => <button type="button" className="task-insertion-option" key={item.id} onClick={() => choose(item.task)}>
            <span>{item.task.title}<small>{item.templateTitle} · {item.sectionTitle}</small></span><strong>{formatNumber(item.task.maxPoints)} P.</strong>
          </button>)}{!templates ? <p className="p-3 themed-muted">Bibliothek wird geladen …</p> : !filteredItems.length ? <p className="p-3 themed-muted">Keine passenden Bausteine. Bitte ändere Suche oder Filter.</p> : null}</div>
        </> : <>
          {mode === "editor" ? <button type="button" className="task-insertion-option" onClick={() => choose(null)}><span>Leere Unteraufgabe</span><span aria-hidden="true">+</span></button> :
            suggestions.map((item) => <button type="button" className="task-insertion-option" key={item.id} onClick={() => choose(item.task)}><span>{item.task.title}</span><strong>{formatNumber(item.task.maxPoints)} P.</strong></button>)}
          <button type="button" className="task-insertion-option task-insertion-browse" onClick={() => setLibrary(true)}><span>{mode === "builder" ? "Alle Bausteine durchsuchen" : "Aus Vorlage einfügen …"}</span><SearchIcon className="h-4 w-4 shrink-0" /></button>
        </>}
      </div>
    </div>, document.fullscreenElement ?? document.body) : null}
  </Context.Provider>;
};
