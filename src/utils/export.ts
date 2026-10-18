import { ClassOverviewData, Exam, ExamSummary } from "../types";
import { formatNumber } from "./format";
import { getEffectiveGradeScaleMode } from "./gradeScaleGenerator";
import { getGradeScaleRangeDigits, getGradeScaleRanges } from "./gradeScaleRanges";
import { isLinkedSectionFollower, isLinkedSectionLeader } from "./sectionLinks";
import { SecurityTokenCard } from "./securityTokens";

type DocxModule = typeof import("docx");

export interface GradeListEntry {
  position: number;
  alias: string;
  fullName?: string | null;
  participation: string;
  hasGrade: boolean;
  totalAchievedPoints: number;
  totalMaxPoints: number;
  percentage: number;
  gradeLabel: string;
  gradeVerbalLabel: string;
}

const DOCX_COLORS = {
  ink: "172033",
  muted: "526071",
  accent: "274C77",
  surface: "F6F8FB",
  rule: "D8D8D8",
} as const;

const createDocxCell = (
  docx: DocxModule,
  text: string,
  options: { bold?: boolean; header?: boolean; align?: "left" | "center" | "right"; plain?: boolean } = {},
) => {
  const alignment =
    options.align === "center"
      ? docx.AlignmentType.CENTER
      : options.align === "right"
        ? docx.AlignmentType.RIGHT
        : docx.AlignmentType.LEFT;
  const isHeader = options.header ?? false;

  return new docx.TableCell({
    verticalAlign: docx.VerticalAlign.CENTER,
    shading: options.plain ? undefined : { fill: isHeader ? DOCX_COLORS.accent : DOCX_COLORS.surface },
    margins: options.plain ? { top: 35, bottom: 35, left: 50, right: 50 } : { top: 90, bottom: 90, left: 120, right: 120 },
    children: [
      new docx.Paragraph({
        alignment,
        spacing: { after: 0, line: options.plain ? 200 : 240 },
        children: [
          new docx.TextRun({
            text,
            bold: options.bold ?? isHeader,
            size: 18,
            color: options.plain || !isHeader ? DOCX_COLORS.ink : "FFFFFF",
          }),
        ],
      }),
    ],
  });
};

const createDocxTable = (docx: DocxModule, rows: InstanceType<DocxModule["TableRow"]>[], plain = false) =>
  new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    layout: docx.TableLayoutType.AUTOFIT,
    borders: {
      top: { style: docx.BorderStyle.SINGLE, size: 8, color: plain ? "111111" : DOCX_COLORS.rule },
      bottom: { style: docx.BorderStyle.SINGLE, size: 8, color: plain ? "111111" : DOCX_COLORS.rule },
      insideHorizontal: { style: docx.BorderStyle.SINGLE, size: 4, color: DOCX_COLORS.rule },
    },
    rows,
  });

const createDocxDocument = (
  docx: DocxModule,
  options: {
    title: string;
    subtitle?: string;
    children: InstanceType<DocxModule["Paragraph"]>[] | InstanceType<DocxModule["Table"]>[] | Array<InstanceType<DocxModule["Paragraph"]> | InstanceType<DocxModule["Table"]>>;
    plain?: boolean;
  },
) => {
  return new docx.Document({
    creator: "Erwartungshorizont Studio",
    title: options.title,
    subject: options.subtitle,
    sections: [
      {
        properties: {
          page: {
            margin: { top: "16mm", right: "16mm", bottom: "16mm", left: "16mm" },
          },
        },
        ...(options.plain
          ? {}
          : {
              headers: {
                default: new docx.Header({
                  children: [
                    new docx.Paragraph({
                      border: { bottom: { style: docx.BorderStyle.SINGLE, size: 10, color: DOCX_COLORS.accent } },
                      spacing: { after: 100 },
                      children: [
                        new docx.TextRun({ text: "ERWARTUNGSHORIZONT STUDIO", bold: true, size: 14, color: DOCX_COLORS.accent }),
                        new docx.TextRun({ text: options.subtitle ? `  ·  ${options.subtitle}` : "", size: 14, color: DOCX_COLORS.muted }),
                      ],
                    }),
                  ],
                }),
              },
              footers: {
                default: new docx.Footer({
                  children: [
                    new docx.Paragraph({
                      alignment: docx.AlignmentType.RIGHT,
                      spacing: { before: 80 },
                      children: [
                        new docx.TextRun({ text: "Seite ", size: 16, color: DOCX_COLORS.muted }),
                        new docx.TextRun({ children: [docx.PageNumber.CURRENT], size: 16, color: DOCX_COLORS.muted }),
                      ],
                    }),
                  ],
                }),
              },
            }),
        children: options.children,
      },
    ],
  });
};

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
export type PreparedFileSave = {
  save: (blob: Blob) => Promise<FileSaveResult>;
};

export type PreparedFileSavePromise = Promise<PreparedFileSave | null>;

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

const docxSaveOptions: SavePickerOptions = {
  description: "Word-Dokument",
  accept: { "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"] },
};

/**
 * Starts Chromium's save dialog while the button click is still trusted. The
 * document itself may then be assembled asynchronously without the browser
 * treating the dialog as an unsolicited popup.
 */
export const prepareDocxFileSave = (filename: string): PreparedFileSavePromise =>
  prepareFileSave(filename, docxSaveOptions);

const savePreparedBlob = async (targetPromise: PreparedFileSavePromise, blob: Blob) => {
  const target = await targetPromise;
  return target ? target.save(blob) : "cancelled" as const;
};

export const getEditableExamDocxFilename = (exam: Exam, identity?: PrintIdentity) => {
  const timestamp = new Date().toISOString().slice(0, 10);
  return `${sanitizeFilenamePart(identity?.alias || exam.meta.title || "Bewertungsbogen")}_${timestamp}.docx`;
};

export const getClassEditableExamDocxFilename = (exam: Exam, reports: PrintPayload[]) => {
  const timestamp = new Date().toISOString().slice(0, 10);
  return `${sanitizeFilenamePart(reports[0]?.identity?.className || exam.meta.course || exam.meta.title || "Klasse")}_${timestamp}.docx`;
};

export const getGradeScaleDocxFilename = (exam: Exam, filenamePrefix?: string) => {
  const timestamp = new Date().toISOString().slice(0, 10);
  return `${sanitizeFilenamePart(filenamePrefix || exam.meta.title || "Notenbereiche")}_Notenbereiche_${timestamp}.docx`;
};

export const getClassOverviewDocxFilename = (exam: Exam, context?: { className?: string }) => {
  const timestamp = new Date().toISOString().slice(0, 10);
  return `${sanitizeFilenamePart(context?.className || exam.meta.course || exam.meta.title || "Klassenuebersicht")}_${timestamp}.docx`;
};

export const getGradeListDocxFilename = (exam: Exam, context?: { className?: string }) => {
  const timestamp = new Date().toISOString().slice(0, 10);
  return `${sanitizeFilenamePart(context?.className || exam.meta.course || exam.meta.title || "Notenliste")}_Notenliste_${timestamp}.docx`;
};

const createEditableExamDocxChildren = (
  docx: DocxModule,
  exam: Exam,
  summary: ExamSummary,
  identity?: PrintIdentity,
  options?: { hideResults?: boolean },
) => {
  const { Paragraph, TableRow, TextRun } = docx;
  const meta = [
    ["Fach", identity?.subject || exam.meta.subject || "—"],
    ["Klasse", identity?.className || exam.meta.course || "—"],
    ["Schuljahr", exam.meta.schoolYear || "—"],
    ["Datum", exam.meta.examDate || "—"],
    ["Lehrkraft", exam.meta.teacher || "—"],
    ["Schüler:in", identity?.fullName || identity?.alias || "—"],
  ];
  const children = [
    new Paragraph({
      children: [new TextRun({ text: exam.meta.title || "Bewertungsbogen", bold: true, size: 32, color: DOCX_COLORS.ink })],
      spacing: { after: 80 },
    }),
    ...(exam.meta.unit
      ? [new Paragraph({ children: [new TextRun({ text: exam.meta.unit, italics: true, color: DOCX_COLORS.muted })], spacing: { after: 180 } })]
      : []),
    createDocxTable(docx, meta.map(([label, value]) => new TableRow({ children: [createDocxCell(docx, label, { bold: true }), createDocxCell(docx, value)] }))),
    new Paragraph({
      children: [new TextRun({ text: "Bewertung", bold: true, size: 24, color: DOCX_COLORS.accent })],
      spacing: { before: 300, after: 120 },
    }),
  ];

  exam.sections.forEach((section, sectionIndex) => {
    const sectionPoints = section.tasks.reduce((total, task) => total + task.maxPoints, 0);
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `${sectionIndex + 1}. ${section.title || "Aufgabenteil"}`, bold: true, size: 22, color: DOCX_COLORS.accent })],
        spacing: { before: 240, after: 70 },
        keepNext: true,
      }),
    );
    if (section.description.trim()) {
      children.push(new Paragraph({ children: [new TextRun({ text: section.description, color: DOCX_COLORS.muted })], spacing: { after: 100 }, keepNext: true }));
    }
    children.push(
      createDocxTable(docx, [
          new TableRow({
            tableHeader: true,
            children: [createDocxCell(docx, "Aufgabe", { header: true }), createDocxCell(docx, "Erwartung / mögliche Antwort", { header: true }), createDocxCell(docx, "Punkte", { header: true, align: "center" })],
          }),
          ...section.tasks.map((task, taskIndex) =>
            new TableRow({
              children: [
                createDocxCell(docx, `${taskIndex + 1}. ${task.title || "Aufgabe"}`),
                createDocxCell(docx, task.expectation || task.description || "—"),
                createDocxCell(docx, options?.hideResults ? `— / ${formatNumber(task.maxPoints)}` : `${formatNumber(task.achievedPoints)} / ${formatNumber(task.maxPoints)}`, { align: "center" }),
              ],
            }),
          ),
          new TableRow({
            children: [createDocxCell(docx, "Summe", { bold: true }), createDocxCell(docx, ""), createDocxCell(docx, `${formatNumber(sectionPoints)} Punkte`, { bold: true, align: "center" })],
          }),
        ]),
    );
  });

  if (!options?.hideResults) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "Ergebnis", bold: true, size: 24, color: DOCX_COLORS.accent })],
        spacing: { before: 300, after: 120 },
      }),
      createDocxTable(docx, [
          new TableRow({ children: [createDocxCell(docx, "Gesamtpunkte", { bold: true }), createDocxCell(docx, `${formatNumber(summary.totalAchievedPoints)} / ${formatNumber(summary.totalMaxPoints)}`)] }),
          new TableRow({ children: [createDocxCell(docx, "Prozent", { bold: true }), createDocxCell(docx, `${formatNumber(summary.finalPercentage)} %`)] }),
          new TableRow({ children: [createDocxCell(docx, "Note", { bold: true }), createDocxCell(docx, `${summary.grade.label} · ${summary.grade.verbalLabel}`)] }),
          new TableRow({ children: [createDocxCell(docx, "Kommentar", { bold: true }), createDocxCell(docx, identity?.teacherComment || "") ] }),
        ]),
    );
  }

  return children;
};

export const exportEditableExamDocx = async (
  exam: Exam,
  summary: ExamSummary,
  identity?: PrintIdentity,
  options?: { hideResults?: boolean; saveTarget?: PreparedFileSavePromise },
) => {
  const filename = getEditableExamDocxFilename(exam, identity);
  const saveTarget = options?.saveTarget ?? prepareDocxFileSave(filename);
  const docx = await import("docx");
  const { Packer } = docx;
  const children = createEditableExamDocxChildren(docx, exam, summary, identity, options);
  const document = createDocxDocument(docx, {
    title: exam.meta.title || "Bewertungsbogen",
    subtitle: [identity?.subject || exam.meta.subject, identity?.className || exam.meta.course].filter(Boolean).join(" · "),
    children,
  });
  const blob = await Packer.toBlob(document);
  return savePreparedBlob(saveTarget, blob);
};

/** Combines the same individual student sheets into one editable class document. */
export const exportClassEditableExamDocx = async (
  exam: Exam,
  reports: PrintPayload[],
  options?: { saveTarget?: PreparedFileSavePromise },
) => {
  const filename = getClassEditableExamDocxFilename(exam, reports);
  const saveTarget = options?.saveTarget ?? prepareDocxFileSave(filename);
  const docx = await import("docx");
  const { Packer, PageBreak, Paragraph } = docx;
  const children = reports.flatMap((report, index) => [
    ...createEditableExamDocxChildren(docx, report.exam, report.summary, report.identity),
    ...(index < reports.length - 1 ? [new Paragraph({ children: [new PageBreak()] })] : []),
  ]);
  const blob = await Packer.toBlob(createDocxDocument(docx, {
    title: `${exam.meta.title || "Bewertungsbogen"} – Klasse`,
    subtitle: [exam.meta.subject, exam.meta.course].filter(Boolean).join(" · "),
    children,
  }));
  return savePreparedBlob(saveTarget, blob);
};

export const exportGradeScaleDocx = async (
  exam: Exam,
  summary: ExamSummary,
  filenamePrefix?: string,
  options?: { saveTarget?: PreparedFileSavePromise },
) => {
  const filename = getGradeScaleDocxFilename(exam, filenamePrefix);
  const saveTarget = options?.saveTarget ?? prepareDocxFileSave(filename);
  const docx = await import("docx");
  const { Packer, Paragraph, TableRow, TextRun } = docx;
  const ranges = getGradeScaleRanges(exam, summary.totalMaxPoints);
  const digits = getGradeScaleRangeDigits(exam, summary.totalMaxPoints);
  const children = [
    new Paragraph({ children: [new TextRun({ text: exam.meta.title || "Notenbereiche", bold: true, size: 32, color: DOCX_COLORS.ink })], spacing: { after: 80 } }),
    new Paragraph({ children: [new TextRun({ text: `${exam.gradeScale.title || "Notenschlüssel"} · ${formatNumber(summary.totalMaxPoints)} Gesamtpunkte`, color: DOCX_COLORS.muted })], spacing: { after: 180 } }),
    createDocxTable(docx, [
        new TableRow({ tableHeader: true, children: [createDocxCell(docx, "Note", { header: true, align: "center" }), createDocxCell(docx, "Von", { header: true, align: "center" }), createDocxCell(docx, "Bis", { header: true, align: "center" })] }),
        ...ranges.map((range) => new TableRow({
          children: [
            createDocxCell(docx, range.label, { bold: true, align: "center" }),
            createDocxCell(docx, formatNumber(Number(range.lowerBound.toFixed(digits))), { align: "center" }),
            createDocxCell(docx, formatNumber(Number(range.upperBound.toFixed(digits))), { align: "center" }),
          ],
        })),
      ]),
  ];
  const blob = await Packer.toBlob(createDocxDocument(docx, {
    title: exam.meta.title || "Notenbereiche",
    subtitle: exam.gradeScale.title || "Notenschlüssel",
    children,
  }));
  return savePreparedBlob(saveTarget, blob);
};

export const exportClassOverviewDocx = async (
  exam: Exam,
  overview: ClassOverviewData,
  context?: { subject?: string; className?: string },
  options?: { saveTarget?: PreparedFileSavePromise },
) => {
  const filename = getClassOverviewDocxFilename(exam, context);
  const saveTarget = options?.saveTarget ?? prepareDocxFileSave(filename);
  const docx = await import("docx");
  const { Packer, Paragraph, TableRow, TextRun } = docx;
  const children = [
    new Paragraph({ children: [new TextRun({ text: `${exam.meta.title || "Klassenübersicht"} – Klassenübersicht`, bold: true, size: 32, color: DOCX_COLORS.ink })], spacing: { after: 80 } }),
    new Paragraph({ children: [new TextRun({ text: [context?.subject, context?.className, exam.meta.examDate].filter(Boolean).join(" · "), color: DOCX_COLORS.muted })], spacing: { after: 180 } }),
    createDocxTable(docx, [
        new TableRow({ tableHeader: true, children: [createDocxCell(docx, "Schüler:innen", { header: true, align: "center" }), createDocxCell(docx, "Ø Prozent", { header: true, align: "center" }), createDocxCell(docx, "Median", { header: true, align: "center" }), createDocxCell(docx, "Beste Leistung", { header: true, align: "center" }), createDocxCell(docx, "Schwächste Leistung", { header: true, align: "center" })] }),
        new TableRow({ children: [createDocxCell(docx, formatNumber(overview.studentCount), { bold: true, align: "center" }), createDocxCell(docx, `${formatNumber(overview.averagePercentage)} %`, { bold: true, align: "center" }), createDocxCell(docx, `${formatNumber(overview.medianPercentage)} %`, { align: "center" }), createDocxCell(docx, `${formatNumber(overview.bestPercentage)} %`, { align: "center" }), createDocxCell(docx, `${formatNumber(overview.lowestPercentage)} %`, { align: "center" })] }),
      ]),
    new Paragraph({ children: [new TextRun({ text: "Notenspiegel", bold: true, size: 24, color: DOCX_COLORS.accent })], spacing: { before: 280, after: 100 }, keepNext: true }),
    createDocxTable(docx, [
        new TableRow({ tableHeader: true, children: [createDocxCell(docx, "Note", { header: true, align: "center" }), createDocxCell(docx, "Anzahl", { header: true, align: "center" })] }),
        ...overview.gradeDistribution.map((entry) => new TableRow({ children: [createDocxCell(docx, entry.display, { bold: true, align: "center" }), createDocxCell(docx, formatNumber(entry.count), { align: "center" })] })),
      ]),
    new Paragraph({ children: [new TextRun({ text: "Aufgaben im Überblick", bold: true, size: 24, color: DOCX_COLORS.accent })], spacing: { before: 280, after: 100 }, keepNext: true }),
    createDocxTable(docx, [
        new TableRow({ tableHeader: true, children: [createDocxCell(docx, "Bereich", { header: true }), createDocxCell(docx, "Aufgabe", { header: true }), createDocxCell(docx, "Ø Prozent", { header: true, align: "center" })] }),
        ...overview.taskDistribution.map((entry) => new TableRow({ children: [createDocxCell(docx, entry.sectionTitle), createDocxCell(docx, entry.taskTitle), createDocxCell(docx, `${formatNumber(entry.percentage)} %`, { align: "center" })] })),
      ]),
  ];
  const blob = await Packer.toBlob(createDocxDocument(docx, {
    title: `${exam.meta.title || "Klassenübersicht"} – Klassenübersicht`,
    subtitle: [context?.subject, context?.className].filter(Boolean).join(" · "),
    children,
  }));
  return savePreparedBlob(saveTarget, blob);
};

export const exportGradeListDocx = async (
  exam: Exam,
  entries: GradeListEntry[],
  context?: { subject?: string; className?: string },
  options?: { saveTarget?: PreparedFileSavePromise },
) => {
  const filename = getGradeListDocxFilename(exam, context);
  const saveTarget = options?.saveTarget ?? prepareDocxFileSave(filename);
  const docx = await import("docx");
  const { Packer, Paragraph, TableRow, TextRun } = docx;
  const children = [
    new Paragraph({ children: [new TextRun({ text: `${exam.meta.title || "Notenliste"} – Notenliste`, bold: true, size: 32, color: DOCX_COLORS.ink })], spacing: { after: 80 } }),
    new Paragraph({ children: [new TextRun({ text: [context?.subject, context?.className, exam.meta.examDate].filter(Boolean).join(" · "), color: DOCX_COLORS.muted })], spacing: { after: 180 } }),
    createDocxTable(docx, [
      new TableRow({ tableHeader: true, children: [
        createDocxCell(docx, "Nr.", { header: true, align: "center" }),
        createDocxCell(docx, "Schüler:in", { header: true }),
        createDocxCell(docx, "Code", { header: true }),
        createDocxCell(docx, "Teilnahme", { header: true }),
        createDocxCell(docx, "Punkte", { header: true, align: "right" }),
        createDocxCell(docx, "%", { header: true, align: "right" }),
        createDocxCell(docx, "Note", { header: true, align: "center" }),
      ] }),
      ...entries.map((entry) => new TableRow({ children: [
        createDocxCell(docx, String(entry.position), { align: "center" }),
        createDocxCell(docx, entry.fullName?.trim() || "—"),
        createDocxCell(docx, entry.alias),
        createDocxCell(docx, entry.participation),
        createDocxCell(docx, entry.hasGrade ? `${formatNumber(entry.totalAchievedPoints)} / ${formatNumber(entry.totalMaxPoints)}` : "—", { align: "right" }),
        createDocxCell(docx, entry.hasGrade ? `${formatNumber(entry.percentage)} %` : "—", { align: "right" }),
        createDocxCell(docx, entry.hasGrade ? (entry.gradeVerbalLabel ? `${entry.gradeLabel} · ${entry.gradeVerbalLabel}` : entry.gradeLabel) : "—", { bold: true, align: "center" }),
      ] })),
    ]),
  ];
  const blob = await Packer.toBlob(createDocxDocument(docx, {
    title: `${exam.meta.title || "Notenliste"} – Notenliste`,
    subtitle: [context?.subject, context?.className].filter(Boolean).join(" · "),
    children,
  }));
  return savePreparedBlob(saveTarget, blob);
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

    // Make the manual route available immediately. Some browsers do not honour an
    // automatic print request from a newly opened popup, and a delayed image must
    // never leave the popup without a working print control.
    ensureToolbar();

    const afterReady = async () => {
      ${waitForImages
        ? `const images = Array.from(document.images);
      if (images.length > 0) {
        await Promise.all(images.map((image) => {
          if (image.complete && image.naturalWidth > 0) return Promise.resolve();
          return new Promise((resolve) => {
            const finish = () => resolve();
            image.addEventListener("load", finish, { once: true });
            image.addEventListener("error", finish, { once: true });
            window.setTimeout(finish, 4000);
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
  return `"${normalized.replace(/"/g, "\"\"")}"`;
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

  return saveBlobWithDialog(`${filename}.csv`, new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" }), {
    description: "CSV-Notenübersicht",
    accept: { "text/csv": [".csv"] },
  });
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
          .report { break-after: auto; page-break-after: auto; }
          .report-break { break-after: page; page-break-after: always; }
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

export const openGradeListPrintWindow = (
  exam: Exam,
  entries: GradeListEntry[],
  context?: { subject?: string; className?: string },
  preparedPopup?: Window | null,
) => {
  const popup = preparedPopup ?? openPopupHost(1040, 900, "Notenliste");
  if (!popup) return false;

  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
  const safePrefix = sanitizeFilenamePart(context?.className || exam.meta.title || "Notenliste");
  const documentTitle = buildPrintDocumentTitle(`${safePrefix}_Notenliste_${timestamp}.pdf`);
  const rows = entries
    .map((entry) => `
      <tr>
        <td>${renderNumber(entry.position)}</td>
        <td>${renderText(entry.fullName, "—")}</td>
        <td>${renderText(entry.alias, "—")}</td>
        <td>${renderText(entry.participation, "—")}</td>
        <td class="number">${entry.hasGrade ? `${renderNumber(entry.totalAchievedPoints)} / ${renderNumber(entry.totalMaxPoints)}` : "—"}</td>
        <td class="number">${entry.hasGrade ? `${renderNumber(entry.percentage)} %` : "—"}</td>
        <td class="grade">${entry.hasGrade ? `${renderText(entry.gradeLabel, "—")}${entry.gradeVerbalLabel ? `<small>${renderText(entry.gradeVerbalLabel)}</small>` : ""}` : "—"}</td>
      </tr>
    `)
    .join("");

  popup.document.write(`
    <!doctype html>
    <html lang="de">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(documentTitle)}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111; margin: 0; padding: 12px; font-size: 10px; line-height: 1.3; }
          h1, h2, p { margin: 0; }
          h1 { font-size: 17px; }
          h2 { margin-top: 2px; font-size: 10px; font-weight: 400; color: #444; }
          .sheet { border: 1px solid #bbb; padding: 10px; }
          .meta { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 4px 10px; font-size: 9px; color: #333; }
          table { width: 100%; margin-top: 11px; border-collapse: collapse; }
          th, td { border: 1px solid #aaa; padding: 5px 6px; vertical-align: top; text-align: left; }
          th { background: #e9edf4; font-size: 8px; letter-spacing: .04em; text-transform: uppercase; }
          td:first-child, th:first-child { width: 28px; text-align: center; }
          .number { text-align: right; white-space: nowrap; }
          .grade { text-align: center; font-weight: 700; white-space: nowrap; }
          .grade small { display: block; margin-top: 1px; color: #555; font-size: 8px; font-weight: 400; }
          tbody tr { break-inside: avoid; }
          thead { display: table-header-group; }
          @page { size: A4 landscape; margin: 8mm; }
        </style>
      </head>
      <body>
        <section class="sheet">
          <h1>${renderText(exam.meta.title, "Notenliste")}</h1>
          <h2>${renderText(context?.className || exam.meta.course || "-", "-")}${context?.subject ? ` | ${renderText(context.subject)}` : ""}</h2>
          <div class="meta">
            <span><strong>Schuljahr:</strong> ${renderText(exam.meta.schoolYear, "-")}</span>
            <span><strong>Lehrkraft:</strong> ${renderText(exam.meta.teacher, "-")}</span>
            <span><strong>Datum:</strong> ${renderText(exam.meta.examDate, "-")}</span>
            <span><strong>Erstellt:</strong> ${getGermanPrintDate()}</span>
          </div>
          <table>
            <thead><tr><th>Nr.</th><th>Schüler:in</th><th>Code</th><th>Teilnahme</th><th>Punkte</th><th>Prozent</th><th>Note</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
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
