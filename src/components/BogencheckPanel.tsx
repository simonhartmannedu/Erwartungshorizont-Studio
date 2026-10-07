import { useEffect, useMemo, useState } from "react";
import { toDataURL } from "qrcode";
import { AnswerSheetBlock, AnswerSheetSettings, Exam, MatchingAnswerBlock, MultipleChoiceAnswerBlock, MultipleResponseAnswerBlock, OrderingAnswerBlock, TrueFalseAnswerBlock } from "../types";
import { encodeAnswerSheetQrValue, getMatchingBlocks, getMultipleChoiceBlocks, getSelectableAnswerMaximum } from "../utils/answerSheets";
import { CheckIcon, DownloadIcon, PlusIcon, TrashIcon } from "./icons";
import { Card, Field, NumberInput } from "./ui";

type PrintStudent = { id: string; alias: string; fullName: string; answerSheetCode: string };
type SelectableBlock = MultipleChoiceAnswerBlock | MatchingAnswerBlock | TrueFalseAnswerBlock | MultipleResponseAnswerBlock | OrderingAnswerBlock;
type BogencheckType = SelectableBlock["type"];
const MAX_ANSWER_ROWS_PER_SHEET = 18;

type Props = {
  exam: Exam;
  students: PrintStudent[];
  groupLabel: string | null;
  disabled: boolean;
  onChange: (settings: AnswerSheetSettings) => void;
  onCreateLinkedTask: (type: BogencheckType, title: string, maxPoints: number) => string;
  onCreateCodes: () => void;
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
const splitValues = (value: string) => value.split(/[,;\n]/).map((entry) => entry.trim()).filter(Boolean);
const flattenTasks = (exam: Exam) => exam.sections.flatMap((section) => section.tasks.map((task) => ({ id: task.id, label: `${section.title || "Bereich"} · ${task.title || "Aufgabe"}`, maxPoints: task.maxPoints })));
const isSelectableBlock = (block: AnswerSheetBlock): block is SelectableBlock => block.type === "multipleChoice" || block.type === "matching" || block.type === "trueFalse" || block.type === "multipleResponse" || block.type === "ordering";
const blockLabel = (type: BogencheckType) => ({ multipleChoice: "Multiple Choice", multipleResponse: "Mehrfachauswahl", trueFalse: "Richtig / Falsch", matching: "Zuordnung", ordering: "Reihenfolge" })[type];
const answerFieldLabel = (block: SelectableBlock) => block.type === "matching" ? "Auswahlbuchstaben" : block.type === "ordering" ? "Rangplätze" : block.type === "trueFalse" ? "Antworten" : "Antwortoptionen";
const formatAnswerKey = (block: SelectableBlock) => block.type === "multipleResponse"
  ? block.correctAnswers.map((answers) => answers.join(" + ")).join("; ")
  : (block.type === "matching" || block.type === "ordering")
  ? block.correctAnswers.map((answer, index) => `${index + 1}-${answer}`).join(", ")
  : block.correctAnswers.join(", ");
const parseAnswerKey = (block: SelectableBlock, value: string) => splitValues(value)
  .map((entry) => block.type === "matching" || block.type === "ordering" ? entry.replace(/^\s*\d+\s*[-=:]\s*/, "") : entry)
  .filter((entry) => block.optionLabels.includes(entry));
const parseMultipleResponseAnswerKey = (block: MultipleResponseAnswerBlock, value: string) => value.split(/[;\n]/)
  .map((entry) => Array.from(new Set(entry.split("+").map((choice) => choice.trim()).filter((choice) => block.optionLabels.includes(choice)))))
  .filter((choices) => choices.length > 0);
const resizeAnswerPoints = (answerPoints: number[], count: number) => Array.from({ length: count }, (_, index) => answerPoints[index] ?? 1);

const CompactInput = ({ value, onCommit }: { value: string; onCommit: (value: string) => void }) => {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return <input className="field" value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={() => onCommit(draft)} />;
};

const updateBlock = (settings: AnswerSheetSettings, id: string, update: (block: SelectableBlock) => SelectableBlock) => ({
  ...settings,
  blocks: settings.blocks.map((block) => block.id === id && isSelectableBlock(block) ? update(block) : block),
});

const createAnswerTableMarkup = (block: SelectableBlock) => `
  <section class="block"><h2>${escapeHtml(block.title || blockLabel(block.type))}</h2>
    <table><thead><tr><th>Nr.</th>${block.optionLabels.map((label) => `<th>${escapeHtml(label)}</th>`).join("")}</tr></thead>
    <tbody>${block.correctAnswers.map((_, index) => `<tr><td>${index + 1}</td>${block.optionLabels.map(() => "<td><span class=\"answer-bubble\" aria-hidden=\"true\"></span></td>").join("")}</tr>`).join("")}</tbody></table>
  </section>`;

export const BogencheckPanel = ({ exam, students, groupLabel, disabled, onChange, onCreateLinkedTask, onCreateCodes }: Props) => {
  const settings = exam.answerSheetSettings ?? { blocks: [] };
  const [printing, setPrinting] = useState(false);
  const tasks = useMemo(() => flattenTasks(exam), [exam]);
  const multipleChoiceBlocks = getMultipleChoiceBlocks(exam);
  const matchingBlocks = getMatchingBlocks(exam);
  const selectableBlocks = settings.blocks.filter(isSelectableBlock);
  const answerFieldCount = selectableBlocks.reduce((total, block) => total + block.correctAnswers.length, 0);
  const readyStudents = students.filter((student) => student.answerSheetCode);

  const addMultipleChoice = () => {
    const title = `Multiple Choice ${multipleChoiceBlocks.length + 1}`;
    onChange({
      ...settings,
      blocks: [...settings.blocks.filter(isSelectableBlock), {
        id: crypto.randomUUID(), type: "multipleChoice", title,
        taskId: onCreateLinkedTask("multipleChoice", title, 1), managedTask: true, optionLabels: ["A", "B", "C", "D"], correctAnswers: ["A"], answerPoints: [1],
      }],
    });
  };

  const addMatching = () => {
    const title = `Zuordnung ${matchingBlocks.length + 1}`;
    onChange({
      ...settings,
      blocks: [...settings.blocks.filter(isSelectableBlock), {
        id: crypto.randomUUID(), type: "matching", title,
        taskId: onCreateLinkedTask("matching", title, 1), managedTask: true, optionLabels: ["A", "B", "C", "D"], correctAnswers: ["A"], answerPoints: [1],
      }],
    });
  };

  const addTrueFalse = () => {
    const title = `Richtig / Falsch ${selectableBlocks.filter((block) => block.type === "trueFalse").length + 1}`;
    onChange({ ...settings, blocks: [...settings.blocks.filter(isSelectableBlock), {
      id: crypto.randomUUID(), type: "trueFalse", title, taskId: onCreateLinkedTask("trueFalse", title, 1), managedTask: true,
      optionLabels: ["Richtig", "Falsch"], correctAnswers: ["Richtig"], answerPoints: [1],
    }] });
  };

  const addMultipleResponse = () => {
    const title = `Mehrfachauswahl ${selectableBlocks.filter((block) => block.type === "multipleResponse").length + 1}`;
    onChange({ ...settings, blocks: [...settings.blocks.filter(isSelectableBlock), {
      id: crypto.randomUUID(), type: "multipleResponse", title, taskId: onCreateLinkedTask("multipleResponse", title, 1), managedTask: true,
      optionLabels: ["A", "B", "C", "D"], correctAnswers: [["A", "B"]], answerPoints: [1],
    }] });
  };

  const addOrdering = () => {
    const title = `Reihenfolge ${selectableBlocks.filter((block) => block.type === "ordering").length + 1}`;
    onChange({ ...settings, blocks: [...settings.blocks.filter(isSelectableBlock), {
      id: crypto.randomUUID(), type: "ordering", title, taskId: onCreateLinkedTask("ordering", title, 1), managedTask: true,
      optionLabels: ["1", "2", "3", "4"], correctAnswers: ["1"], answerPoints: [1],
    }] });
  };

  const removeBlock = (id: string) => onChange({ ...settings, blocks: settings.blocks.filter((block) => block.id !== id) });

  const printAnswerSheets = async () => {
    if (readyStudents.length === 0) return;
    const popup = window.open("", "_blank", "width=1024,height=1400");
    if (!popup) return;
    setPrinting(true);
    try {
      const codes = await Promise.all(readyStudents.map(async (student) => ({
        ...student,
        qr: await toDataURL(encodeAnswerSheetQrValue(student.answerSheetCode), { width: 220, margin: 1, errorCorrectionLevel: "M" }),
      })));
      const title = escapeHtml(exam.meta.title.trim() || "Klassenarbeit");
      const meta = [exam.meta.subject, exam.meta.course, exam.meta.examDate, exam.meta.teacher].filter(Boolean).map(escapeHtml).join(" · ");
      const answerMarkup = selectableBlocks.map(createAnswerTableMarkup).join("");
      popup.document.write(`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Bogencheck · ${title}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; } *{box-sizing:border-box} body{margin:0;color:#111;font:11pt Arial,sans-serif} .sheet{min-height:273mm;break-after:page;position:relative}.head{border-bottom:2px solid #111;padding-bottom:5mm;display:flex;justify-content:space-between;gap:10mm}.eyebrow{font-size:8pt;text-transform:uppercase;letter-spacing:.13em;font-weight:bold}.title{margin:2mm 0 1mm;font-size:20pt}.meta{color:#444}.qr{width:32mm;height:32mm}.code{font:700 10pt 'Courier New',monospace;letter-spacing:.12em}.instruction{margin:6mm 0;padding:3mm 4mm;border:1px solid #222;background:#f5f5f5;line-height:1.35}.block{margin:6mm 0;break-inside:avoid}.block h2{font-size:12pt;margin:0 0 3mm}.block table{border-collapse:collapse;width:100%;text-align:center}.block th,.block td{border:1px solid #555;height:9mm}.block th:first-child,.block td:first-child{width:16mm;font-weight:bold}.answer-bubble{display:block;width:5.6mm;height:5.6mm;margin:auto;border:1.4px solid #111;border-radius:50%;print-color-adjust:exact;-webkit-print-color-adjust:exact}.footer{position:absolute;bottom:0;width:100%;border-top:1px solid #777;padding-top:2mm;color:#555;font-size:8pt}.decoder{break-before:page}.decoder table{width:100%;border-collapse:collapse;margin-top:6mm}.decoder th,.decoder td{border:1px solid #555;padding:3mm;text-align:left}.decoder th{background:#eee}.warn{margin-top:6mm;border:1px solid #555;padding:4mm;font-size:9pt}@media print{.sheet:last-of-type{break-after:auto}}</style></head><body>
        ${codes.map((student) => `<article class="sheet"><header class="head"><div><div class="eyebrow">Bogencheck · Antwortbeiblatt</div><h1 class="title">${title}</h1><p class="meta">${meta || "Klassenarbeit"}</p></div><div><img class="qr" src="${student.qr}" alt="Arbeitscode ${escapeHtml(student.answerSheetCode)}"><div class="code">${escapeHtml(student.answerSheetCode)}</div></div></header><p class="instruction">Dieses Beiblatt gehört zur Klausur. Die vollständigen Aufgaben und Lückentexte stehen auf dem Klausurbogen. Kreuze hier nur die vorgegebenen Antworten deutlich an. Bei Mehrfachauswahl können mehrere Kreise pro Zeile markiert werden.</p>${answerMarkup || "<p>Für diese Klassenarbeit sind noch keine ankreuzbaren Aufgaben angelegt.</p>"}<footer class="footer">Arbeitscode ${escapeHtml(student.answerSheetCode)} · Bitte ohne Namen abgeben.</footer></article>`).join("")}
        <article class="decoder"><div class="eyebrow">Nur für die Lehrkraft</div><h1 class="title">Bogencheck · Entschlüsselungstabelle</h1><p class="meta">${title}${groupLabel ? ` · ${escapeHtml(groupLabel)}` : ""}</p><table><thead><tr><th>Arbeitscode</th><th>Schüler:in</th><th>Kürzel</th></tr></thead><tbody>${codes.map((student) => `<tr><td class="code">${escapeHtml(student.answerSheetCode)}</td><td>${escapeHtml(student.fullName)}</td><td>${escapeHtml(student.alias)}</td></tr>`).join("")}</tbody></table><p class="warn">Diese Tabelle enthält Klarnamen und bleibt bei der Lehrkraft. Die Antwortbeiblätter selbst enthalten ausschließlich zufällige Arbeitscodes.</p></article>
      <script>addEventListener('load',()=>setTimeout(()=>{focus();print()},250))</script></body></html>`);
      popup.document.close();
    } finally {
      setPrinting(false);
    }
  };

  return <div className="space-y-6">
    <Card title="Bogencheck" subtitle="QR-Antwortbeiblatt für eindeutig bewertbare Antwortformate – die Klausur selbst bleibt unverändert.">
      <div className="callout callout-info"><p><strong>Keine doppelte Klausur.</strong> Fragen, Materialien und Lückentexte verbleiben auf dem klassischen Klausurbogen. Hier hinterlegst du nur die Antwortstruktur, die auf dem Beiblatt angekreuzt wird.</p></div>
      {!groupLabel ? <div className="callout callout-warning mt-4"><p>Ordne zuerst eine Lerngruppe zu, damit EWH persönliche Antwortbeiblätter erzeugen kann.</p></div> : null}
      <div className="mt-5 flex flex-wrap gap-2"><button type="button" className="button-secondary gap-2" disabled={disabled} onClick={addMultipleChoice}><PlusIcon /> Multiple Choice</button><button type="button" className="button-secondary gap-2" disabled={disabled} onClick={addMultipleResponse}><PlusIcon /> Mehrfachauswahl</button><button type="button" className="button-secondary gap-2" disabled={disabled} onClick={addTrueFalse}><PlusIcon /> Richtig / Falsch</button><button type="button" className="button-secondary gap-2" disabled={disabled} onClick={addMatching}><PlusIcon /> Zuordnung</button><button type="button" className="button-secondary gap-2" disabled={disabled} onClick={addOrdering}><PlusIcon /> Reihenfolge</button></div>
    </Card>

    {selectableBlocks.map((block) => <Card key={block.id} title={blockLabel(block.type)} actions={<button type="button" className="button-secondary" onClick={() => removeBlock(block.id)}><TrashIcon /> Entfernen</button>}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Bezeichnung auf dem Beiblatt"><input className="field" value={block.title} onChange={(event) => onChange(updateBlock(settings, block.id, (current) => ({ ...current, title: event.target.value })))} /></Field>
        <Field label="Punktetabelle zuordnen"><select className="field" value={block.taskId ?? ""} onChange={(event) => onChange(updateBlock(settings, block.id, (current) => ({ ...current, taskId: event.target.value || null, managedTask: event.target.value === current.taskId ? current.managedTask : false })))}><option value="">Noch nicht zuordnen</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.label} · {task.maxPoints} P.</option>)}</select></Field>
        <Field label={answerFieldLabel(block)} hint={block.type === "ordering" ? "Rangplätze, z. B. 1, 2, 3, 4" : "Muss der Beschriftung auf der Klausur entsprechen, z. B. A, B, C, D"}><CompactInput value={block.optionLabels.join(", ")} onCommit={(value) => onChange(updateBlock(settings, block.id, (current) => ({ ...current, optionLabels: splitValues(value) })))} /></Field>
        <Field label="Lösungsschlüssel" hint={block.type === "multipleResponse" ? "Eine Zeile je Teilfrage, Antworten mit + verbinden, z. B. A + C; B + D" : block.type === "matching" || block.type === "ordering" ? "Zum Beispiel: 1-C, 2-B, 3-A, 4-D" : "Zum Beispiel: Richtig, Falsch, Richtig"}><CompactInput value={formatAnswerKey(block)} onCommit={(value) => onChange(updateBlock(settings, block.id, (current) => { if (current.type === "multipleResponse") { const correctAnswers = parseMultipleResponseAnswerKey(current, value); return { ...current, correctAnswers, answerPoints: resizeAnswerPoints(current.answerPoints, correctAnswers.length) }; } const correctAnswers = parseAnswerKey(current, value); return { ...current, correctAnswers, answerPoints: resizeAnswerPoints(current.answerPoints, correctAnswers.length) }; }))} /></Field>
        <div className="md:col-span-2"><p className="mb-2 text-sm font-medium">Punkte pro Zeile</p><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{block.correctAnswers.map((answer, index) => <Field key={`${Array.isArray(answer) ? answer.join("-") : answer}-${index}`} label={block.type === "matching" || block.type === "ordering" ? `${index + 1} → ${Array.isArray(answer) ? answer.join(" + ") : answer}` : `Antwort ${index + 1} · ${Array.isArray(answer) ? answer.join(" + ") : answer}`}><NumberInput className="field" value={block.answerPoints[index] ?? 1} min={0} step={0.5} onCommit={(value) => onChange(updateBlock(settings, block.id, (current) => { const answerPoints = resizeAnswerPoints(current.answerPoints, current.correctAnswers.length); answerPoints[index] = value; return { ...current, answerPoints }; }))} /></Field>)}</div></div>
        <p className="themed-muted self-end text-sm">{block.correctAnswers.length} Antwortfelder · maximal {getSelectableAnswerMaximum(block)} Punkte</p>
        {block.managedTask ? <p className="themed-muted text-sm md:col-span-2">Diese EWH-Aufgabe wird automatisch mit Titel und Maximalpunktzahl aus dem Bogencheck synchronisiert.</p> : null}
      </div>
    </Card>)}

    <Card title="Antwortbeiblätter drucken" subtitle="Jeder Bogen enthält nur einen zufälligen Code; die separate Tabelle entschlüsselt ihn lokal für die Lehrkraft." actions={<button type="button" className="button-primary gap-2" disabled={disabled || students.length === 0 || selectableBlocks.length === 0 || answerFieldCount > MAX_ANSWER_ROWS_PER_SHEET || printing} onClick={readyStudents.length === students.length ? printAnswerSheets : onCreateCodes}>{readyStudents.length === students.length ? <><DownloadIcon /> {printing ? "Bereitet vor …" : "Beiblätter & Tabelle drucken"}</> : <><CheckIcon /> Arbeitscodes erzeugen</>}</button>}>
      <p className="themed-muted text-sm leading-6">{readyStudents.length}/{students.length} Arbeitscodes vorbereitet. {answerFieldCount}/{MAX_ANSWER_ROWS_PER_SHEET} Antwortfelder belegen eine DIN-A4-Seite. Die Codes sind zufällig, enthalten keinen Namen und werden bei geschützten Lerngruppen mit den übrigen Bewertungsdaten verschlüsselt gespeichert.</p>
      {answerFieldCount > MAX_ANSWER_ROWS_PER_SHEET ? <div className="callout callout-warning mt-4"><p>Für ein einzelnes DIN-A4-Beiblatt sind höchstens {MAX_ANSWER_ROWS_PER_SHEET} Antwortfelder vorgesehen. Teile die Aufgaben auf zwei Klausuren auf oder reduziere die Raster.</p></div> : null}
    </Card>
  </div>;
};
