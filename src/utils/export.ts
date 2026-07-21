import { ClassOverviewData, Exam, ExamSummary } from "../types";
import { formatNumber } from "./format";
import { getEffectiveGradeBands, getEffectiveGradeScaleMode } from "./gradeScaleGenerator";
import { getGradeScaleRangeDigits, getGradeScaleRanges } from "./gradeScaleRanges";
import { isLinkedSectionFollower, isLinkedSectionLeader } from "./sectionLinks";
import { SecurityTokenCard } from "./securityTokens";

export const downloadJson = (exam: Exam) => {
  const blob = new Blob([JSON.stringify(exam, null, 2)], { type: "application/json" });
  void saveBlobWithDialog(`${exam.meta.title || "bewertungsraster"}.json`, blob, {
    description: "JSON-Datei",
    accept: { "application/json": [".json"] },
  });
};

type FileSaveResult = "saved" | "downloaded" | "cancelled";
type BrowserFileHandle = {
  createWritable: () => Promise<{
    write: (data: Blob) => Promise<void>;
    close: () => Promise<void>;
  }>;
};
type BrowserSaveFilePicker = (options?: {
  suggestedName?: string;
  types?: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
  excludeAcceptAllOption?: boolean;
}) => Promise<BrowserFileHandle>;
type SavePickerOptions = {
  description: string;
  accept: Record<string, string[]>;
};
type PreparedFileSave = {
  save: (blob: Blob) => Promise<FileSaveResult>;
};

const getSaveFilePicker = () => {
  const candidate = window as Window & { showSaveFilePicker?: BrowserSaveFilePicker };
  return typeof candidate.showSaveFilePicker === "function"
    ? candidate.showSaveFilePicker.bind(window)
    : null;
};

const downloadBlob = (filename: string, blob: Blob): FileSaveResult => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return "downloaded";
};

export const prepareFileSave = async (
  filename: string,
  options: SavePickerOptions,
): Promise<PreparedFileSave | null> => {
  const picker = getSaveFilePicker();
  if (!picker) {
    return {
      save: async (blob) => downloadBlob(filename, blob),
    };
  }

  try {
    const handle = await picker({
      suggestedName: filename,
      types: [options],
      excludeAcceptAllOption: false,
    });
    return {
      save: async (blob) => {
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return "saved";
      },
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return null;
    }

    console.warn("System-Speicherdialog nicht verfügbar, nutze Browser-Download.", error);
    return {
      save: async (blob) => downloadBlob(filename, blob),
    };
  }
};

export const saveBlobWithDialog = async (
  filename: string,
  blob: Blob,
  options: SavePickerOptions,
) => {
  const target = await prepareFileSave(filename, options);
  if (!target) return "cancelled" as const;
  return target.save(blob);
};

export const exportEditableExamDocx = async (exam: Exam, summary: ExamSummary, identity?: PrintIdentity) => {
  const { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } = await import("docx");
  const textCell = (text: string, bold = false) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, bold })] })] });
  const meta = [["Fach", identity?.subject || exam.meta.subject || "—"], ["Klasse", identity?.className || exam.meta.course || "—"], ["Schuljahr", exam.meta.schoolYear || "—"], ["Datum", exam.meta.examDate || "—"], ["Lehrkraft", exam.meta.teacher || "—"], ["Schüler:in", identity?.fullName || identity?.alias || "—"]];
  const children = [
    new Paragraph({ children: [new TextRun({ text: exam.meta.title || "Bewertungsbogen", bold: true, size: 30 })], spacing: { after: 120 } }),
    ...(exam.meta.unit ? [new Paragraph({ children: [new TextRun({ text: exam.meta.unit, italics: true })], spacing: { after: 180 } })] : []),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: meta.map(([label, value]) => new TableRow({ children: [textCell(label, true), textCell(value)] })) }),
    new Paragraph({ children: [new TextRun({ text: "Bewertung", bold: true, size: 24 })], spacing: { before: 300, after: 100 } }),
  ];
  exam.sections.forEach((section, sectionIndex) => {
    const sectionPoints = section.tasks.reduce((total, task) => total + task.maxPoints, 0);
    children.push(new Paragraph({ children: [new TextRun({ text: `${sectionIndex + 1}. ${section.title || "Aufgabenteil"}`, bold: true, size: 22 })], spacing: { before: 220, after: 80 } }));
    if (section.description.trim()) children.push(new Paragraph({ children: [new TextRun({ text: section.description })], spacing: { after: 80 } }));
    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
      new TableRow({ children: [textCell("Aufgabe", true), textCell("Erwartung / mögliche Antwort", true), textCell("Punkte", true)] }),
      ...section.tasks.map((task, taskIndex) => new TableRow({ children: [textCell(`${taskIndex + 1}. ${task.title || "Aufgabe"}`), textCell(task.description || "—"), textCell(`${formatNumber(task.achievedPoints)} / ${formatNumber(task.maxPoints)}`)] })),
      new TableRow({ children: [textCell("Summe", true), textCell("", true), textCell(`${formatNumber(sectionPoints)} Punkte`, true)] }),
    ] }));
  });
  children.push(
    new Paragraph({ children: [new TextRun({ text: "Ergebnis", bold: true, size: 24 })], spacing: { before: 300, after: 100 } }),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
      new TableRow({ children: [textCell("Gesamtpunkte", true), textCell(`${formatNumber(summary.totalAchievedPoints)} / ${formatNumber(summary.totalMaxPoints)}`)] }),
      new TableRow({ children: [textCell("Prozent", true), textCell(`${formatNumber(summary.finalPercentage)} %`)] }),
      new TableRow({ children: [textCell("Note", true), textCell(`${summary.grade.label} · ${summary.grade.verbalLabel}`)] }),
      new TableRow({ children: [textCell("Kommentar", true), textCell(identity?.teacherComment || "")] }),
    ] }),
  );
  const document = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(document);
  const filename = `${sanitizeFilenamePart(identity?.alias || exam.meta.title || "Bewertungsbogen")}_${new Date().toISOString().slice(0, 10)}.docx`;
  return saveBlobWithDialog(filename, blob, { description: "Word-Dokument", accept: { "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"] } });
};

interface PrintIdentity {
  alias: string;
  fullName?: string | null;
  subject?: string;
  className?: string;
  teacherComment?: string;
  signatureDataUrl?: string | null;
}

interface PrintOptions {
  hideGrade?: boolean;
  hideTeacherComment?: boolean;
  hideSignature?: boolean;
}

interface PrintPayload {
  exam: Exam;
  summary: ExamSummary;
  identity?: PrintIdentity;
  options?: PrintOptions;
}

export type PrintPopupHandle = Window;

export type { PrintIdentity, PrintPayload };

export interface CommentTemplateContext {
  alias?: string | null;
  fullName?: string | null;
  subject?: string;
  className?: string;
  examTitle?: string;
  examDate?: string;
  totalAchievedPoints?: number;
  totalMaxPoints?: number;
  percentage?: number;
  gradeLabel?: string;
  gradeVerbalLabel?: string;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderText = (value: string | null | undefined, fallback = "") => {
  const normalized = value?.trim() ?? "";
  return normalized ? escapeHtml(normalized) : fallback;
};

const renderNumber = (value: number) => escapeHtml(String(value));
const getGermanPrintDate = () => escapeHtml(new Date().toLocaleDateString("de-DE"));

const sanitizeImageSource = (value: string | null | undefined) => {
  const normalized = value?.trim() ?? "";
  if (!normalized) return null;
  if (/^(data:image\/|blob:|https?:)/i.test(normalized)) {
    return escapeHtml(normalized);
  }

  if (normalized.startsWith("/")) {
    const origin = window.location?.origin?.trim();
    const resolved = origin ? new URL(normalized, origin).href : normalized;
    return escapeHtml(resolved);
  }

  return null;
};

const sanitizeFilenamePart = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

const buildPrintDocumentTitle = (filename?: string) => {
  const trimmed = filename?.trim();
  if (!trimmed) return "Bewertungsbogen";
  return trimmed.toLowerCase().endsWith(".pdf") ? trimmed.slice(0, -4) : trimmed;
};

const openPopupHost = (width: number, height: number, title = "Druckansicht"): PrintPopupHandle | null => {
  const popup = window.open("", "_blank", `width=${width},height=${height}`);
  if (!popup) return null;
  popup.opener = null;
  popup.document.write(`
    <!doctype html>
    <html lang="de">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #111; }
          .status { max-width: 560px; margin: 12vh auto 0; border: 1px solid #d0d0d0; border-radius: 16px; padding: 20px; }
          h1 { margin: 0 0 8px; font-size: 20px; }
          p { margin: 0; line-height: 1.5; color: #444; }
        </style>
      </head>
      <body>
        <div class="status">
          <h1>Druckansicht wird vorbereitet</h1>
          <p>Wenn Safari den Druckdialog nicht automatisch öffnet, nutze danach den Button "Drucken" oben rechts.</p>
        </div>
      </body>
    </html>
  `);
  popup.document.close();
  return popup;
};

export const openPrintPopupHost = (options?: {
  width?: number;
  height?: number;
  title?: string;
}) => openPopupHost(options?.width ?? 1024, options?.height ?? 1400, options?.title ?? "Druckansicht");

const buildPrintActivationScript = (waitForImages = false) => `
  <script>
    const triggerPrint = () => {
      const run = () => {
        window.focus();
        window.print();
      };
      if (window.requestAnimationFrame) {
        window.requestAnimationFrame(() => window.requestAnimationFrame(run));
        return;
      }
      window.setTimeout(run, 0);
    };

    const ensureToolbar = () => {
      if (document.getElementById("manual-print-button")) return;
      if (!document.getElementById("manual-print-button-print-style")) {
        const style = document.createElement("style");
        style.id = "manual-print-button-print-style";
        style.textContent = "@media print { #manual-print-button { display: none !important; visibility: hidden !important; } }";
        document.head.appendChild(style);
      }
      const button = document.createElement("button");
      button.id = "manual-print-button";
      button.type = "button";
      button.textContent = "Drucken";
      button.setAttribute("aria-label", "Druckdialog öffnen");
      button.style.position = "fixed";
      button.style.top = "12px";
      button.style.right = "12px";
      button.style.zIndex = "9999";
      button.style.border = "1px solid #111";
      button.style.borderRadius = "999px";
      button.style.background = "#fff";
      button.style.color = "#111";
      button.style.padding = "10px 14px";
      button.style.font = "600 14px Arial, sans-serif";
      button.style.boxShadow = "0 4px 18px rgba(0,0,0,0.12)";
      button.addEventListener("click", triggerPrint);
      document.body.appendChild(button);
    };

    window.addEventListener("beforeprint", () => {
      const button = document.getElementById("manual-print-button");
      if (button) button.hidden = true;
    });

    window.addEventListener("afterprint", () => {
      const button = document.getElementById("manual-print-button");
      if (button) button.hidden = false;
    });

    const afterReady = async () => {
      ensureToolbar();
      ${waitForImages
        ? `const images = Array.from(document.images);
      if (images.length > 0) {
        await Promise.all(images.map((image) => {
          if (image.complete && image.naturalWidth > 0) return Promise.resolve();
          return new Promise((resolve) => {
            const finish = () => resolve();
            image.addEventListener("load", finish, { once: true });
            image.addEventListener("error", finish, { once: true });
          });
        }));
      }`
        : ""}
      triggerPrint();
    };

    if (document.readyState === "complete" || document.readyState === "interactive") {
      void afterReady();
    } else {
      window.addEventListener("DOMContentLoaded", () => {
        void afterReady();
      }, { once: true });
    }

    window.addEventListener("pageshow", () => {
      ensureToolbar();
    });
  </script>
`;

const splitFullName = (value: string | null | undefined) => {
  const normalized = value?.trim() ?? "";
  if (!normalized) {
    return {
      firstName: "",
      lastName: "",
    };
  }

  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return {
      firstName: parts[0] ?? "",
      lastName: "",
    };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1] ?? "",
  };
};

export const resolveCommentTemplate = (template: string, context: CommentTemplateContext) => {
  const { firstName, lastName } = splitFullName(context.fullName);
  const fallbackName = context.fullName?.trim() || context.alias?.trim() || "";
  const replacements = new Map<string, string>([
    ["name", fallbackName],
    ["sus", fallbackName],
    ["schueler", fallbackName],
    ["schüler", fallbackName],
    ["vorname", firstName || fallbackName],
    ["nachname", lastName],
    ["kuerzel", context.alias?.trim() ?? ""],
    ["kürzel", context.alias?.trim() ?? ""],
    ["klasse", context.className?.trim() ?? ""],
    ["fach", context.subject?.trim() ?? ""],
    ["titel", context.examTitle?.trim() ?? ""],
    ["datum", context.examDate?.trim() ?? ""],
    ["punkte", context.totalAchievedPoints !== undefined ? formatNumber(context.totalAchievedPoints) : ""],
    ["maxpunkte", context.totalMaxPoints !== undefined ? formatNumber(context.totalMaxPoints) : ""],
    ["prozent", context.percentage !== undefined ? `${formatNumber(context.percentage)} %` : ""],
    ["note", context.gradeLabel?.trim() ?? ""],
    ["notenstufe", context.gradeVerbalLabel?.trim() ?? ""],
  ]);

  return template.replace(/\$([^$]+)\$/g, (token, rawKey) => {
    const normalizedKey = String(rawKey).trim().toLocaleLowerCase("de-DE");
    return replacements.get(normalizedKey) ?? token;
  });
};

const renderPercentageBar = (value: number) => `
  <div class="bar-track">
    <div class="bar-fill" style="width:${Math.max(0, Math.min(value, 100))}%;"></div>
  </div>
`;

const renderCompactGradeScaleBlock = (exam: Exam, totalMaxPoints: number) => {
  const ranges = getGradeScaleRanges(exam, totalMaxPoints);
  const rangeDigits = getGradeScaleRangeDigits(exam, totalMaxPoints);

  return `
    <div class="grade-scale-print-block">
      <div class="grade-scale-print-header">
        <div>
          <strong>Notenbereiche</strong>
          <p>Punktespannen bei ${renderNumber(totalMaxPoints)} erreichbaren Punkten.</p>
        </div>
        <span class="grade-scale-print-chip">
          ${renderText(getEffectiveGradeScaleMode(exam.gradeScale) === "points" ? "Punkteschlüssel" : "Aus Prozent umgerechnet")}
        </span>
      </div>
      <table class="grade-scale-print-table">
        <thead>
          <tr>
            ${ranges.map((range) => `<th>${renderText(range.label)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          <tr>
            ${ranges
              .map(
                (range) =>
                  `<td>${renderNumber(Number(range.lowerBound.toFixed(rangeDigits)))} - ${renderNumber(Number(range.upperBound.toFixed(rangeDigits)))}</td>`,
              )
              .join("")}
          </tr>
        </tbody>
      </table>
    </div>
  `;
};

const renderCompactTaskColumns = (overview: ClassOverviewData) => {
  const columnCount = 3;
  const rowsPerColumn = Math.ceil(overview.taskDistribution.length / columnCount);
  const columns = Array.from({ length: columnCount }, (_, columnIndex) =>
    overview.taskDistribution.slice(columnIndex * rowsPerColumn, (columnIndex + 1) * rowsPerColumn),
  );

  return `
    <div class="task-columns">
      ${columns
        .map((column) => `
          <div class="task-column">
            ${column
              .map((entry) => `
                <div class="task-chip">
                  <div class="task-chip-title">${renderText(entry.sectionTitle, "-")} · ${renderText(entry.taskTitle, "-")}</div>
                  <div class="task-chip-value">${renderNumber(Number(entry.percentage.toFixed(1)))} %</div>
                </div>
              `)
              .join("")}
          </div>
        `)
        .join("")}
    </div>
  `;
};

export const downloadDataFile = async (filename: string, payload: unknown) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  return saveBlobWithDialog(filename, blob, {
    description: "JSON-Backup",
    accept: { "application/json": [".json"] },
  });
};

const escapeCsvCell = (value: string | number | boolean | null | undefined) => {
  const normalized = value === null || value === undefined ? "" : String(value);
  const escaped = normalized.replace(/"/g, "\"\"");
  return `"${escaped}"`;
};

export const downloadCsvFile = async (
  filename: string,
  rows: Array<Record<string, string | number | boolean | null | undefined>>,
) => {
  if (rows.length === 0) return "cancelled" as const;

  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>()),
  );

  const csv = [
    headers.map(escapeCsvCell).join(";"),
    ...rows.map((row) => headers.map((header) => escapeCsvCell(row[header])).join(";")),
  ].join("\r\n");

  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  return saveBlobWithDialog(filename, blob, {
    description: "CSV-Datei",
    accept: { "text/csv": [".csv"] },
  });
};

export const exportStudentExamCsv = (
  exam: Exam,
  summary: ExamSummary,
  identity?: PrintIdentity,
) => {
  const resolvedComment = resolveCommentTemplate(identity?.teacherComment ?? "", {
    alias: identity?.alias,
    fullName: identity?.fullName,
    subject: identity?.subject,
    className: identity?.className,
    examTitle: exam.meta.title,
    examDate: exam.meta.examDate,
    totalAchievedPoints: summary.totalAchievedPoints,
    totalMaxPoints: summary.totalMaxPoints,
    percentage: summary.finalPercentage,
    gradeLabel: summary.grade.label,
    gradeVerbalLabel: summary.grade.verbalLabel,
  });

  const rows = exam.sections.flatMap((section, sectionIndex) =>
    section.tasks.map((task, taskIndex) => ({
      Schuelercode: identity?.alias ?? "",
      Schuelername: identity?.fullName ?? "",
      Fach: identity?.subject ?? "",
      Klasse: identity?.className ?? "",
      Titel: exam.meta.title,
      Datum: exam.meta.examDate,
      BereichNr: sectionIndex + 1,
      Bereich: section.title,
      AufgabenNr: `${sectionIndex + 1}.${taskIndex + 1}`,
      Aufgabe: task.title,
      Beschreibung: task.description,
      Erwartung: task.expectation,
      MaxPunkte: task.maxPoints,
      ErreichtPunkte: task.achievedPoints,
      Gesamtpunkte: summary.totalAchievedPoints,
      GesamtMaxPunkte: summary.totalMaxPoints,
      Prozent: summary.finalPercentage,
      Note: summary.grade.label,
      Notenstufe: summary.grade.verbalLabel,
      Kommentar: resolvedComment,
    })),
  );

  const safePrefix = sanitizeFilenamePart(identity?.alias || exam.meta.title || "SuS");
  void downloadCsvFile(`${safePrefix}_Bewertungsbogen.csv`, rows);
};

export const exportGradeScaleCsv = (
  exam: Exam,
  summary: ExamSummary,
  filenamePrefix?: string,
) => {
  const ranges = getGradeScaleRanges(exam, summary.totalMaxPoints);
  const bandsByLabel = new Map(
    getEffectiveGradeBands(exam.gradeScale, summary.totalMaxPoints).map((band) => [band.label, band.verbalLabel]),
  );
  const rangeDigits = getGradeScaleRangeDigits(exam, summary.totalMaxPoints);
  const safePrefix = sanitizeFilenamePart(filenamePrefix || exam.meta.title || "Notenbereiche");

  void downloadCsvFile(
    `${safePrefix}_Notenbereiche.csv`,
    ranges.map((range) => ({
      Note: range.label,
      Notenstufe: bandsByLabel.get(range.label) ?? "",
      Untergrenze: Number(range.lowerBound.toFixed(rangeDigits)),
      Obergrenze: Number(range.upperBound.toFixed(rangeDigits)),
      Gesamtpunktzahl: summary.totalMaxPoints,
      Modus: getEffectiveGradeScaleMode(exam.gradeScale) === "points" ? "Punkte" : "Prozent",
    })),
  );
};

export const exportClassOverviewCsv = (
  exam: Exam,
  overview: ClassOverviewData,
  context?: { subject?: string; className?: string },
) => {
  const safePrefix = sanitizeFilenamePart(context?.className || exam.meta.title || "Klassenuebersicht");
  const rows: Array<Record<string, string | number | null | undefined>> = [
    {
      Typ: "Kennzahl",
      Bereich: "Klasse",
      Label: "Schüler:innen",
      Wert: overview.studentCount,
      Zusatz: context?.className ?? "",
    },
    {
      Typ: "Kennzahl",
      Bereich: "Leistung",
      Label: "Durchschnitt Prozent",
      Wert: Number(overview.averagePercentage.toFixed(1)),
      Zusatz: "",
    },
    {
      Typ: "Kennzahl",
      Bereich: "Leistung",
      Label: "Median Prozent",
      Wert: Number(overview.medianPercentage.toFixed(1)),
      Zusatz: "",
    },
    {
      Typ: "Kennzahl",
      Bereich: "Leistung",
      Label: "Beste Leistung",
      Wert: Number(overview.bestPercentage.toFixed(1)),
      Zusatz: "",
    },
    {
      Typ: "Kennzahl",
      Bereich: "Leistung",
      Label: "Schwächste Leistung",
      Wert: Number(overview.lowestPercentage.toFixed(1)),
      Zusatz: "",
    },
    ...overview.gradeDistribution.map((entry) => ({
      Typ: "Notenspiegel",
      Bereich: "Note",
      Label: entry.display,
      Wert: entry.count,
      Zusatz: entry.label,
    })),
    ...overview.sectionDistribution.map((entry) => ({
      Typ: "Abschnitt",
      Bereich: entry.title,
      Label: "Durchschnitt Prozent",
      Wert: Number(entry.percentage.toFixed(1)),
      Zusatz: `${formatNumber(entry.achievedPoints)} / ${formatNumber(entry.maxPoints)} Punkte`,
    })),
    ...overview.taskDistribution.map((entry) => ({
      Typ: "Aufgabe",
      Bereich: entry.sectionTitle,
      Label: entry.taskTitle,
      Wert: Number(entry.percentage.toFixed(1)),
      Zusatz: `${formatNumber(entry.achievedPoints)} / ${formatNumber(entry.maxPoints)} Punkte`,
    })),
  ];

  void downloadCsvFile(`${safePrefix}_Klassenuebersicht.csv`, rows);
};

export interface ScoringExportStudent {
  alias: string;
  fullName?: string | null;
  isAbsent?: boolean;
  scores?: Record<string, number>;
}

interface ScoringExportContext {
  className?: string | null;
  subject?: string | null;
  students?: ScoringExportStudent[];
}

const getTaskEntries = (exam: Exam) =>
  exam.sections.flatMap((section, sectionIndex) =>
    section.tasks.map((task, taskIndex) => ({
      section,
      task,
      label: `${sectionIndex + 1}.${taskIndex + 1}`,
      header: `${sectionIndex + 1}.${taskIndex + 1} ${task.title} (${formatNumber(task.maxPoints)} P.)`,
    })),
  );

const getScoringStudents = (students?: ScoringExportStudent[]) =>
  students && students.length > 0
    ? students
    : [
        {
          alias: "S01",
          fullName: "",
          isAbsent: false,
          scores: {},
        },
      ];

const columnName = (columnIndex: number) => {
  let index = columnIndex + 1;
  let name = "";
  while (index > 0) {
    const remainder = (index - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    index = Math.floor((index - 1) / 26);
  }
  return name;
};

const quoteFormulaText = (value: string) => `"${value.replace(/"/g, "\"\"")}"`;

const buildGradeFormula = (referenceCell: string, exam: Exam, totalMaxPoints: number) => {
  const bands = [...getEffectiveGradeBands(exam.gradeScale, totalMaxPoints)]
    .filter((band) => Number.isFinite(band.lowerBound))
    .sort((left, right) => right.lowerBound - left.lowerBound);

  return bands.reduceRight(
    (fallback, band) => `IF(${referenceCell}>=${Number(band.lowerBound.toFixed(4))},${quoteFormulaText(band.label)},${fallback})`,
    quoteFormulaText(""),
  );
};

const buildScoringRows = (
  exam: Exam,
  context?: ScoringExportContext,
  options?: { dataStartRow?: number },
) => {
  const tasks = getTaskEntries(exam);
  const students = getScoringStudents(context?.students);
  const totalMaxPoints = tasks.reduce((sum, entry) => sum + entry.task.maxPoints, 0);
  const firstTaskColumn = 3;
  const totalColumn = firstTaskColumn + tasks.length;
  const maxColumn = totalColumn + 1;
  const percentColumn = maxColumn + 1;
  const gradeColumn = percentColumn + 1;
  const dataStartRow = options?.dataStartRow ?? 2;

  const rows = students.map((student, studentIndex) => {
    const rowNumber = studentIndex + dataStartRow;
    const firstTaskCell = `${columnName(firstTaskColumn)}${rowNumber}`;
    const lastTaskCell = `${columnName(Math.max(firstTaskColumn, firstTaskColumn + tasks.length - 1))}${rowNumber}`;
    const totalCell = `${columnName(totalColumn)}${rowNumber}`;
    const maxCell = `${columnName(maxColumn)}${rowNumber}`;
    const percentCell = `${columnName(percentColumn)}${rowNumber}`;
    const gradeReference =
      getEffectiveGradeScaleMode(exam.gradeScale) === "points" ? totalCell : percentCell;

    return {
      Schuelercode: student.alias,
      Schuelername: student.fullName ?? "",
      Anwesend: student.isAbsent ? "nein" : "ja",
      ...Object.fromEntries(
        tasks.map((entry) => [
          entry.header,
          student.scores && Object.prototype.hasOwnProperty.call(student.scores, entry.task.id)
            ? student.scores[entry.task.id]
            : "",
        ]),
      ),
      Gesamtpunkte: `=SUM(${firstTaskCell}:${lastTaskCell})`,
      MaxPunkte: totalMaxPoints,
      Prozent: `=IF(${maxCell}>0,${totalCell}/${maxCell}*100,0)`,
      Note: `=${buildGradeFormula(gradeReference, exam, totalMaxPoints)}`,
    };
  });

  return {
    rows,
    tasks,
    students,
    totalMaxPoints,
    totalColumn,
    maxColumn,
    percentColumn,
    gradeColumn,
  };
};

export const exportScoringSheetCsv = (exam: Exam, context?: ScoringExportContext) => {
  const safePrefix = sanitizeFilenamePart(context?.className || exam.meta.title || "Punktetabelle");
  void downloadCsvFile(`${safePrefix}_Punktetabelle.csv`, buildScoringRows(exam, context).rows);
};

const createScoringWorkbook = (
  XLSX: typeof import("xlsx"),
  exam: Exam,
  context?: ScoringExportContext,
) => {
  const dataStartRow = 6;
  const scoring = buildScoringRows(exam, context, { dataStartRow });
  const headers = scoring.rows.length > 0 ? Object.keys(scoring.rows[0]) : [];
  const lastColumn = Math.max(0, headers.length - 1);
  const lastColumnName = columnName(lastColumn);
  const metaLine = [
    `Fach: ${context?.subject || exam.meta.subject || "-"}`,
    `Klasse/Kurs: ${context?.className || exam.meta.course || "-"}`,
    `Datum: ${exam.meta.examDate || "-"}`,
    `Max: ${formatNumber(scoring.totalMaxPoints)} Punkte`,
    `Modus: ${getEffectiveGradeScaleMode(exam.gradeScale) === "points" ? "Punkte" : "Prozent"}`,
  ].join("   |   ");
  const data = [
    [exam.meta.title || "Punktetabelle"],
    [metaLine],
    ["Punkte direkt in den Aufgaben-Spalten eintragen. Gesamtpunkte, Prozent und Note werden automatisch berechnet."],
    [],
    headers,
    ...scoring.rows.map((row) => headers.map((header) => row[header as keyof typeof row] ?? "")),
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastColumn } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastColumn } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: lastColumn } },
  ];
  worksheet["!autofilter"] = {
    ref: `A5:${lastColumnName}${Math.max(dataStartRow, dataStartRow + scoring.students.length - 1)}`,
  };

  scoring.students.forEach((_student, index) => {
    const rowNumber = index + dataStartRow;
    [
      { column: scoring.totalColumn, formula: String(scoring.rows[index].Gesamtpunkte).slice(1), type: "n" },
      { column: scoring.percentColumn, formula: String(scoring.rows[index].Prozent).slice(1), type: "n" },
      { column: scoring.gradeColumn, formula: String(scoring.rows[index].Note).slice(1), type: "s" },
    ].forEach(({ column, formula, type }) => {
      const cellRef = `${columnName(column)}${rowNumber}`;
      worksheet[cellRef] = {
        ...(type === "n" ? { v: 0 } : { v: "" }),
        t: type,
        f: formula,
        z: type === "n" ? (column === scoring.percentColumn ? "0.0" : "0.0") : undefined,
      };
    });
  });

  worksheet["!cols"] = headers.map((header, index) => ({
    wch:
      index === 0
        ? 16
        : index === 1
          ? 24
          : index === 2
            ? 10
            : index >= scoring.totalColumn
              ? 12
              : Math.min(18, Math.max(11, header.length / 2)),
  }));
  worksheet["!rows"] = [
    { hpt: 24 },
    { hpt: 18 },
    { hpt: 30 },
    { hpt: 8 },
    { hpt: 30 },
    ...scoring.students.map(() => ({ hpt: 22 })),
  ];
  worksheet["!margins"] = { left: 0.35, right: 0.35, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 };

  Array.from({ length: headers.length }, (_, index) => `${columnName(index)}5`).forEach((cellRef) => {
    if (worksheet[cellRef]) worksheet[cellRef].z = "@";
  });
  scoring.students.forEach((_student, studentIndex) => {
    const rowNumber = studentIndex + dataStartRow;
    scoring.tasks.forEach((_entry, taskIndex) => {
      const cellRef = `${columnName(3 + taskIndex)}${rowNumber}`;
      if (worksheet[cellRef]) worksheet[cellRef].z = "0.0";
    });
    [`${columnName(scoring.totalColumn)}${rowNumber}`, `${columnName(scoring.maxColumn)}${rowNumber}`].forEach((cellRef) => {
      if (worksheet[cellRef]) worksheet[cellRef].z = "0.0";
    });
    const percentCell = `${columnName(scoring.percentColumn)}${rowNumber}`;
    if (worksheet[percentCell]) worksheet[percentCell].z = "0.0";
  });

  const taskSheet = XLSX.utils.json_to_sheet(
    scoring.tasks.map((entry) => ({
      Nr: entry.label,
      Bereich: entry.section.title,
      Aufgabe: entry.task.title,
      MaxPunkte: entry.task.maxPoints,
      Beschreibung: entry.task.description,
      Erwartung: entry.task.expectation,
      Hinweis: entry.section.note,
    })),
  );
  taskSheet["!cols"] = [{ wch: 8 }, { wch: 28 }, { wch: 30 }, { wch: 10 }, { wch: 42 }, { wch: 48 }, { wch: 38 }];
  taskSheet["!rows"] = [{ hpt: 24 }];

  const summary = calculateScoringSheetSummary(exam, scoring.totalMaxPoints);
  const scaleSheet = XLSX.utils.json_to_sheet(summary);
  scaleSheet["!cols"] = [{ wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 16 }];
  scaleSheet["!rows"] = [{ hpt: 24 }];

  const infoSheet = XLSX.utils.aoa_to_sheet([
    ["EWH Punktetabelle"],
    ["Titel", exam.meta.title],
    ["Fach", context?.subject || exam.meta.subject],
    ["Klasse/Kurs", context?.className || exam.meta.course],
    ["Datum", exam.meta.examDate],
    ["Ausfüllen", "Nur die Aufgaben-Spalten in 'Punkte eintragen' bearbeiten. Gesamtpunkte, Prozent und Note sind Formeln."],
    ["ODS", "Empfohlen für Tabellenkalkulationen, weil mehrere Blätter, Formeln, Breiten und Zeilenhöhen erhalten bleiben."],
    ["CSV", "CSV kann nur ein Blatt speichern und hat keine verlässliche Gestaltung."],
  ]);
  infoSheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
  infoSheet["!cols"] = [{ wch: 18 }, { wch: 96 }];
  infoSheet["!rows"] = [{ hpt: 24 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Punkte eintragen");
  XLSX.utils.book_append_sheet(workbook, taskSheet, "Aufgaben");
  XLSX.utils.book_append_sheet(workbook, scaleSheet, "Notenschluessel");
  XLSX.utils.book_append_sheet(workbook, infoSheet, "Hinweise");

  return workbook;
};

export const exportScoringSheetOds = async (exam: Exam, context?: ScoringExportContext) => {
  const XLSX = await import("xlsx");
  const safePrefix = sanitizeFilenamePart(context?.className || exam.meta.title || "Punktetabelle");
  const workbook = createScoringWorkbook(XLSX, exam, context);
  const output = XLSX.write(workbook, { bookType: "ods", type: "array", cellStyles: true, compression: true });
  const blob = new Blob([output], {
    type: "application/vnd.oasis.opendocument.spreadsheet",
  });

  return saveBlobWithDialog(`${safePrefix}_Punktetabelle.ods`, blob, {
    description: "ODS-Tabellendatei",
    accept: {
      "application/vnd.oasis.opendocument.spreadsheet": [".ods"],
    },
  });
};

export const exportScoringSheetXlsx = async (exam: Exam, context?: ScoringExportContext) => {
  const XLSX = await import("xlsx");
  const safePrefix = sanitizeFilenamePart(context?.className || exam.meta.title || "Punktetabelle");
  const workbook = createScoringWorkbook(XLSX, exam, context);
  const output = XLSX.write(workbook, { bookType: "xlsx", type: "array", cellStyles: true, compression: true });
  const blob = new Blob([output], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  return saveBlobWithDialog(`${safePrefix}_Punktetabelle.xlsx`, blob, {
    description: "Excel-Arbeitsmappe",
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
  });
};

const calculateScoringSheetSummary = (exam: Exam, totalMaxPoints: number) => {
  const rangeDigits = getGradeScaleRangeDigits(exam, totalMaxPoints);
  return getGradeScaleRanges(exam, totalMaxPoints).map((range) => ({
    Note: range.label,
    Untergrenze: Number(range.lowerBound.toFixed(rangeDigits)),
    Obergrenze: Number(range.upperBound.toFixed(rangeDigits)),
    Modus: getEffectiveGradeScaleMode(exam.gradeScale) === "points" ? "Punkte" : "Prozent",
    GesamtMaxPunkte: totalMaxPoints,
  }));
};

export const renderPrintDocument = (reports: PrintPayload[]) =>
  reports
    .map(({ exam, summary, identity, options }, reportIndex) => {
      const teacherComment = options?.hideTeacherComment
        ? ""
        : resolveCommentTemplate(identity?.teacherComment?.trim() ?? "", {
            alias: identity?.alias,
            fullName: identity?.fullName,
            subject: identity?.subject,
            className: identity?.className,
            examTitle: exam.meta.title,
            examDate: exam.meta.examDate,
            totalAchievedPoints: summary.totalAchievedPoints,
            totalMaxPoints: summary.totalMaxPoints,
            percentage: summary.finalPercentage,
            gradeLabel: summary.grade.label,
            gradeVerbalLabel: summary.grade.verbalLabel,
          });
      const signatureImageSource = options?.hideSignature ? null : sanitizeImageSource(identity?.signatureDataUrl);
      const germanPrintDate = getGermanPrintDate();
      const footerGridClass = teacherComment && signatureImageSource
        ? "footer-grid footer-grid-halves"
        : "footer-grid";
      const footerBoxes = [
        teacherComment
          ? `<div class="footer-box"><strong>Lehrer*innenkommentar</strong><p style="margin-top:10px;">${renderText(teacherComment)}</p></div>`
          : "",
        signatureImageSource
          ? `<div class="footer-box">
              <strong>Unterschrift / Datum</strong>
              <p style="margin-top:10px;">Datum: ${germanPrintDate}</p>
              <div style="margin-top:10px;"><img src="${signatureImageSource}" alt="Digitale Unterschrift" style="max-width:100%;height:72px;object-fit:contain;object-position:left;" /></div>
            </div>`
          : "",
      ].filter(Boolean).join("");
      const renderSection = (section: Exam["sections"][number], index: number) => {
        const maxPoints = section.maxPointsOverride && section.maxPointsOverride > 0
          ? section.maxPointsOverride
          : section.tasks.reduce((sum, task) => sum + task.maxPoints, 0);
        const achieved = section.tasks.reduce((sum, task) => sum + task.achievedPoints, 0);
        const taskRows = section.tasks
            .map(
              (task) => `
          <tr>
            <td class="task-title-cell">
              <span class="cell-label">Aufgabe</span>
              <strong>${renderText(task.title, "-")}</strong>
            </td>
            <td class="task-answer-cell">
              <span class="cell-label">Mögliche Schülerantwort</span>
              <span>${renderText(task.description, "-")}</span>
            </td>
            <td class="score-cell">${renderNumber(task.maxPoints)}</td>
            <td class="score-cell">${renderNumber(task.achievedPoints)}</td>
          </tr>`,
            )
            .join("");

        return `
        <section class="sheet">
          <h3>${index + 1}. ${renderText(section.title, "Unbenannter Abschnitt")}</h3>
          <p>${renderText(section.description)}</p>
          <table>
            <colgroup>
              <col style="width: 24%;" />
              <col style="width: 64%;" />
              <col style="width: 6%;" />
              <col style="width: 6%;" />
            </colgroup>
            <thead>
              <tr>
                <th>Unteraufgabe</th>
                <th>Mögl. Schülerantwort</th>
                <th>Max.</th>
                <th>Erreicht</th>
              </tr>
            </thead>
            <tbody>${taskRows}</tbody>
          </table>
          <div class="summary-row">
            <span>Bereichsergebnis</span>
            <strong>${renderNumber(achieved)} / ${renderNumber(maxPoints)} Punkte</strong>
          </div>
        </section>
      `;
      };

      const rows = exam.sections
        .map((section, index) => {
          const nextSection = exam.sections[index + 1];
          const isLinkedLead = isLinkedSectionLeader(exam.sections, index);

          if (isLinkedSectionFollower(exam.sections, index)) {
            return "";
          }

          if (!isLinkedLead) {
            return renderSection(section, index);
          }

          return `
        <section class="sheet writing-block">
          <div class="writing-block-header">
            <div>
              <p class="writing-block-label">Verknüpfter Abschnittsblock</p>
              <p>Beide Abschnitte werden zusammen dargestellt, bleiben in der Berechnung aber getrennt.</p>
            </div>
            <div class="writing-block-chip">Verknüpft</div>
          </div>
          ${renderSection(section, index)}
          ${nextSection ? renderSection(nextSection, index + 1) : ""}
        </section>
      `;
        })
        .join("");

      return `
        <article class="report ${reportIndex < reports.length - 1 ? "report-break" : ""}">
          <h1>${renderText(exam.meta.title, "Bewertungsbogen")}</h1>
          <h2>${renderText(exam.meta.unit)}</h2>
          <div class="meta-row">
            <span><strong>Schuljahr:</strong> ${renderText(exam.meta.schoolYear, "-")}</span>
            <span><strong>Jahrgang / Kurs:</strong> ${renderText(exam.meta.gradeLevel, "-")} · ${renderText(exam.meta.course, "-")}</span>
            <span><strong>Lehrkraft:</strong> ${renderText(exam.meta.teacher, "-")}</span>
            <span><strong>Datum:</strong> ${renderText(exam.meta.examDate, "-")}</span>
            ${identity ? `<span><strong>Schülercode:</strong> ${renderText(identity.alias, "-")}</span>` : ""}
            ${identity?.fullName ? `<span><strong>Schülername:</strong> ${renderText(identity.fullName, "-")}</span>` : ""}
            ${identity?.subject ? `<span><strong>Fach:</strong> ${renderText(identity.subject, "-")}</span>` : ""}
            ${identity?.className ? `<span><strong>Klasse:</strong> ${renderText(identity.className, "-")}</span>` : ""}
          </div>
          ${rows}
          <section class="sheet">
            <h3>Gesamtergebnis</h3>
            <div class="summary-row"><span>Rohpunkte</span><strong>${renderNumber(summary.totalAchievedPoints)} / ${renderNumber(summary.totalMaxPoints)}</strong></div>
            ${options?.hideGrade ? "" : `<div class="summary-row"><span>Note</span><strong>${renderText(`${summary.grade.label} (${summary.grade.verbalLabel})`, "-")}</strong></div>`}
            ${options?.hideGrade ? "" : `<div class="summary-line-row"><span></span><strong>________________</strong></div>`}
            ${renderCompactGradeScaleBlock(exam, summary.totalMaxPoints)}
            ${footerBoxes ? `<div class="${footerGridClass}">${footerBoxes}</div>` : ""}
          </section>
        </article>
      `;
    })
    .join("");

const openPrintPopup = (reports: PrintPayload[], filename?: string, popup?: PrintPopupHandle | null) => {
  const targetPopup = popup ?? openPopupHost(1024, 1400, "Druckansicht");
  if (!targetPopup) return false;
  const documentTitle = buildPrintDocumentTitle(filename);

  targetPopup.document.write(`
    <!doctype html>
    <html lang="de">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(documentTitle)}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111; margin: 0; padding: 0; font-size: 9.2px; line-height: 1.1; }
          h1, h2, h3, p { margin: 0 0 4px; }
          h1 { font-size: 15px; }
          h2 { font-size: 10.5px; font-weight: 400; }
          h3 { font-size: 10px; }
          .report { page-break-after: auto; }
          .report-break { page-break-after: always; }
          .sheet { border: 1px solid #bbb; padding: 4px; margin-bottom: 4px; page-break-inside: auto; }
          .meta-row { margin-bottom: 4px; padding-bottom: 2px; border-bottom: 1px solid #bbb; font-size: 8.1px; line-height: 1.05; }
          .meta-row span { display: inline; }
          .meta-row span + span::before { content: " | "; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 3px; table-layout: fixed; }
          th, td { border: 1px solid #bbb; padding: 2px; text-align: left; font-size: 8.1px; line-height: 1.05; vertical-align: top; }
          .writing-block { background: transparent; border-color: #bbb; }
          .writing-block-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 4px; margin-bottom: 3px; }
          .writing-block-label { color: #111; font-size: 8.1px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px; }
          .writing-block-chip { border: 1px solid #bbb; border-radius: 999px; background: transparent; padding: 1px 5px; font-size: 8px; font-weight: 700; white-space: nowrap; }
          .cell-label { display: block; margin-bottom: 1px; color: #555; font-size: 7.8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
          .task-title-cell strong { display: block; font-size: 8.1px; }
          .task-answer-cell span:last-child { display: block; line-height: 1.05; white-space: pre-wrap; }
          .score-cell { text-align: center; white-space: nowrap; font-weight: 700; }
          .summary-row { margin-top: 3px; display: flex; justify-content: space-between; gap: 6px; font-size: 8.2px; }
          .summary-line-row { margin-top: 1px; display: flex; justify-content: space-between; gap: 6px; font-size: 8.2px; }
          .grade-scale-print-block { margin-top: 4px; border: 1px solid #bbb; padding: 4px; }
          .grade-scale-print-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 4px; margin-bottom: 3px; }
          .grade-scale-print-header p { margin-top: 2px; font-size: 8px; color: #444; }
          .grade-scale-print-chip { border: 1px solid #bbb; border-radius: 999px; padding: 1px 5px; font-size: 7.8px; font-weight: 700; white-space: nowrap; }
          .grade-scale-print-table { margin-top: 0; }
          .grade-scale-print-table th,
          .grade-scale-print-table td { text-align: center; font-size: 8px; padding: 2px; }
          .footer-grid { display: grid; grid-template-columns: 1fr; gap: 4px; margin-top: 4px; }
          .footer-grid-halves { grid-template-columns: 1fr 1fr; }
          .footer-box { border: 1px solid #bbb; min-height: 38px; padding: 4px; margin-top: 0; }
          @page {
            size: A4;
            margin-top: 20mm;
            margin-right: 20mm;
            margin-bottom: 20mm;
            margin-left: 25mm;
          }
        </style>
      </head>
      <body>
        ${renderPrintDocument(reports)}
        ${buildPrintActivationScript(true)}
      </body>
    </html>
  `);
  targetPopup.document.close();
  return true;
};

export const openPrintWindow = (
  exam: Exam,
  summary: ExamSummary,
  identity?: PrintIdentity,
  options?: PrintOptions,
  popup?: PrintPopupHandle | null,
) => {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
  const alias = sanitizeFilenamePart(identity?.alias || "Bewertungsbogen");
  const filename = `${alias}_Bewertungsbogen_${timestamp}.pdf`;
  return openPrintPopup([{ exam, summary, identity, options }], filename, popup);
};

export const openBatchPrintWindow = (reports: PrintPayload[], popup?: PrintPopupHandle | null) => {
  if (reports.length === 0) return false;
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
  const className = sanitizeFilenamePart(reports[0]?.identity?.className || "Klasse");
  const filename = `${className}_${timestamp}.pdf`;
  return openPrintPopup(reports, filename, popup);
};

export const openGradeScalePrintWindow = (
  exam: Exam,
  summary: ExamSummary,
  filenamePrefix?: string,
) => {
  const popup = openPopupHost(960, 720, "Notenbereiche");
  if (!popup) return false;

  const ranges = getGradeScaleRanges(exam, summary.totalMaxPoints);
  const rangeDigits = getGradeScaleRangeDigits(exam, summary.totalMaxPoints);
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
  const safePrefix = sanitizeFilenamePart(filenamePrefix || exam.meta.title || "Notenbereiche");
  const documentTitle = buildPrintDocumentTitle(`${safePrefix}_Notenbereiche_${timestamp}.pdf`);

  popup.document.write(`
    <!doctype html>
    <html lang="de">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(documentTitle)}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111; margin: 0; padding: 24px; font-size: 12px; line-height: 1.4; }
          h1, h2, p { margin: 0; }
          h1 { font-size: 20px; }
          h2 { margin-top: 4px; font-size: 13px; font-weight: 400; color: #444; }
          .sheet { border: 1px solid #bbb; padding: 18px; }
          .meta { margin-top: 14px; margin-bottom: 16px; font-size: 12px; color: #333; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          th, td { border: 1px solid #bbb; padding: 10px 8px; text-align: center; vertical-align: middle; }
          th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; background: #f4f4f4; }
          td { font-size: 13px; font-weight: 700; }
          @page {
            size: A4;
            margin: 18mm;
          }
        </style>
      </head>
      <body>
        <section class="sheet">
          <h1>${renderText(exam.meta.title, "Notenbereiche")}</h1>
          <h2>${renderText(exam.gradeScale.title, "Notenschlüssel")}</h2>
          <p class="meta">
            Gesamtpunktzahl: <strong>${renderNumber(summary.totalMaxPoints)}</strong>
            | Modus: <strong>${renderText(getEffectiveGradeScaleMode(exam.gradeScale) === "points" ? "Punkte" : "Prozentbasierte Umrechnung")}</strong>
          </p>
          <table>
            <thead>
              <tr>
                ${ranges.map((range) => `<th>${renderText(range.label)}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              <tr>
                ${ranges
                  .map(
                    (range) =>
                      `<td>${renderNumber(Number(range.lowerBound.toFixed(rangeDigits)))} - ${renderNumber(Number(range.upperBound.toFixed(rangeDigits)))}</td>`,
                  )
                  .join("")}
              </tr>
            </tbody>
          </table>
        </section>
        ${buildPrintActivationScript(false)}
      </body>
    </html>
  `);
  popup.document.close();
  return true;
};

export const openClassOverviewPrintWindow = (
  exam: Exam,
  overview: ClassOverviewData,
  context?: { subject?: string; className?: string },
) => {
  const popup = openPopupHost(1040, 900, "Klassenübersicht");
  if (!popup) return false;

  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
  const safePrefix = sanitizeFilenamePart(context?.className || exam.meta.title || "Klassenuebersicht");
  const documentTitle = buildPrintDocumentTitle(`${safePrefix}_Klassenuebersicht_${timestamp}.pdf`);

  popup.document.write(`
    <!doctype html>
    <html lang="de">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(documentTitle)}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111; margin: 0; padding: 12px; font-size: 10px; line-height: 1.25; }
          h1, h2, h3, p { margin: 0; }
          h1 { font-size: 17px; }
          h2 { margin-top: 2px; font-size: 10px; font-weight: 400; color: #444; }
          h3 { font-size: 10px; margin-bottom: 6px; }
          .sheet { border: 1px solid #bbb; padding: 10px; }
          .meta { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 4px 10px; font-size: 9px; color: #333; }
          .metrics { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; margin-top: 10px; }
          .metric { border: 1px solid #bbb; padding: 6px 7px; }
          .metric-label { font-size: 8px; text-transform: uppercase; letter-spacing: 0.06em; color: #666; }
          .metric-value { margin-top: 3px; font-size: 13px; font-weight: 700; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }
          .panel { border: 1px solid #bbb; padding: 8px; }
          .distribution-row { display: grid; grid-template-columns: 92px 1fr 38px; gap: 6px; align-items: center; margin-top: 5px; }
          .distribution-label { font-size: 9px; }
          .distribution-value { text-align: right; font-weight: 700; }
          .bar-track { height: 7px; overflow: hidden; border: 1px solid #bbb; background: #f4f4f4; }
          .bar-fill { height: 100%; background: #444; }
          .task-panel { margin-top: 10px; border: 1px solid #bbb; padding: 8px; }
          .task-columns { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin-top: 6px; }
          .task-column { display: grid; gap: 4px; }
          .task-chip { border: 1px solid #d5d5d5; padding: 4px 5px; min-height: 34px; }
          .task-chip-title { font-size: 8.2px; line-height: 1.2; color: #333; }
          .task-chip-value { margin-top: 3px; font-size: 10px; font-weight: 700; text-align: right; }
          .muted { color: #555; }
          @page { size: A4 landscape; margin: 8mm; }
        </style>
      </head>
      <body>
        <section class="sheet">
          <h1>${renderText(exam.meta.title, "Klassenübersicht")}</h1>
          <h2>${renderText(context?.className || exam.meta.course || "-", "-")}${context?.subject ? ` | ${renderText(context.subject)}` : ""}</h2>
          <div class="meta">
            <span><strong>Schuljahr:</strong> ${renderText(exam.meta.schoolYear, "-")}</span>
            <span><strong>Lehrkraft:</strong> ${renderText(exam.meta.teacher, "-")}</span>
            <span><strong>Datum:</strong> ${renderText(exam.meta.examDate, "-")}</span>
            <span><strong>Jahrgang / Kurs:</strong> ${renderText(exam.meta.gradeLevel, "-")} · ${renderText(exam.meta.course, "-")}</span>
          </div>

          <div class="metrics">
            <div class="metric">
              <div class="metric-label">Schüler:innen</div>
              <div class="metric-value">${renderNumber(overview.studentCount)}</div>
            </div>
            <div class="metric">
              <div class="metric-label">Ø Prozent</div>
              <div class="metric-value">${renderNumber(Number(overview.averagePercentage.toFixed(1)))} %</div>
            </div>
            <div class="metric">
              <div class="metric-label">Median</div>
              <div class="metric-value">${renderNumber(Number(overview.medianPercentage.toFixed(1)))} %</div>
            </div>
            <div class="metric">
              <div class="metric-label">Beste Leistung</div>
              <div class="metric-value">${renderNumber(Number(overview.bestPercentage.toFixed(1)))} %</div>
            </div>
            <div class="metric">
              <div class="metric-label">Schwächste Leistung</div>
              <div class="metric-value">${renderNumber(Number(overview.lowestPercentage.toFixed(1)))} %</div>
            </div>
          </div>

          <div class="grid">
            <section class="panel">
              <h3>Notenspiegel</h3>
              ${overview.gradeDistribution
                .map((entry) => `
                  <div class="distribution-row">
                    <div class="distribution-label">${renderText(entry.display, "-")}</div>
                    ${renderPercentageBar(overview.studentCount > 0 ? (entry.count / overview.studentCount) * 100 : 0)}
                    <div class="distribution-value">${renderNumber(entry.count)}</div>
                  </div>
                `)
                .join("")}
            </section>
            <section class="panel">
              <h3>Abschnitte im Vergleich</h3>
              ${overview.sectionDistribution
                .map((entry) => `
                  <div class="distribution-row">
                    <div class="distribution-label">${renderText(entry.title, "-")}</div>
                    ${renderPercentageBar(entry.percentage)}
                    <div class="distribution-value">${renderNumber(Number(entry.percentage.toFixed(1)))} %</div>
                  </div>
                `)
                .join("")}
            </section>
          </div>

          <section class="task-panel">
            <h3>Aufgaben im Überblick</h3>
            ${renderCompactTaskColumns(overview)}
          </section>

          <p class="muted" style="margin-top: 8px;">
            Hinweis: Die Aufgabenübersicht zeigt den durchschnittlichen Prozentwert je Aufgabe über alle anwesenden Schüler:innen.
          </p>
        </section>
        ${buildPrintActivationScript(false)}
      </body>
    </html>
  `);
  popup.document.close();
  return true;
};

export const openSecurityTokenPrintWindow = (entries: SecurityTokenCard[]) => {
  if (entries.length === 0) return false;

  const popup = openPopupHost(940, 760, "Klassentokens");
  if (!popup) return false;

  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
  const documentTitle = buildPrintDocumentTitle(`Klassentokens_${timestamp}.pdf`);

  popup.document.write(`
    <!doctype html>
    <html lang="de">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(documentTitle)}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111; margin: 0; padding: 18px; font-size: 12px; line-height: 1.45; background: #fff; }
          h1, h2, p { margin: 0; }
          h1 { font-size: 20px; }
          h2 { font-size: 12px; color: #444; font-weight: 400; margin-top: 4px; }
          .sheet { display: grid; gap: 12px; }
          .intro { border: 1px solid #bbb; padding: 14px 16px; }
          .token-grid { display: grid; gap: 12px; }
          .token-card { border: 1.5px solid #222; border-radius: 16px; padding: 16px; page-break-inside: avoid; }
          .token-kicker { font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: #444; font-weight: 700; }
          .token-title { margin-top: 8px; font-size: 22px; font-weight: 700; }
          .token-meta { margin-top: 6px; font-size: 13px; color: #333; }
          .token-value-wrap { margin-top: 16px; border: 1px dashed #666; border-radius: 14px; padding: 14px 16px; }
          .token-value-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em; color: #555; font-weight: 700; }
          .token-value { margin-top: 10px; font-size: 24px; font-weight: 700; letter-spacing: 0.16em; font-family: "Courier New", monospace; }
          .token-note { margin-top: 12px; font-size: 11px; color: #444; }
          @page { size: A4 portrait; margin: 14mm; }
        </style>
      </head>
      <body>
        <section class="sheet">
          <div class="intro">
            <h1>Security-Tokens für Lerngruppen</h1>
            <h2>Diese Tokens dienen als Entsperrschlüssel für verschlüsselte Schülerdaten.</h2>
            <p style="margin-top:10px;">Nur intern aufbewahren. Wer das Token kennt, kann die jeweilige Lerngruppe lokal entschlüsseln.</p>
          </div>
          <div class="token-grid">
            ${entries.map((entry) => `
              <article class="token-card">
                <div class="token-kicker">Lerngruppe</div>
                <div class="token-title">${renderText(entry.className, "-")}</div>
                <div class="token-meta">${renderText(entry.subject, "-")} | Gruppen-ID: ${renderText(entry.groupId, "-")}</div>
                <div class="token-value-wrap">
                  <div class="token-value-label">Security-Token</div>
                  <div class="token-value">${renderText(entry.token, "-")}</div>
                </div>
                <p class="token-note">Empfehlung: ausdrucken, getrennt von Schülerlisten ablegen und nicht digital weiterleiten.</p>
              </article>
            `).join("")}
          </div>
        </section>
        ${buildPrintActivationScript(false)}
      </body>
    </html>
  `);
  popup.document.close();
  return true;
};
