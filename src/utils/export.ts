import { ClassOverviewData, Exam, ExamSummary } from "../types";
import { formatNumber } from "./format";
import { getEffectiveGradeBands, getEffectiveGradeScaleMode } from "./gradeScaleGenerator";
import { getGradeScaleRangeDigits, getGradeScaleRanges } from "./gradeScaleRanges";
import { isLinkedSectionFollower, isLinkedSectionLeader } from "./sectionLinks";

export const downloadJson = (exam: Exam) => {
  const blob = new Blob([JSON.stringify(exam, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${exam.meta.title || "bewertungsraster"}.json`;
  link.click();
  URL.revokeObjectURL(url);
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

export const downloadDataFile = (filename: string, payload: unknown) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const escapeCsvCell = (value: string | number | boolean | null | undefined) => {
  const normalized = value === null || value === undefined ? "" : String(value);
  const escaped = normalized.replace(/"/g, "\"\"");
  return `"${escaped}"`;
};

export const downloadCsvFile = (
  filename: string,
  rows: Array<Record<string, string | number | boolean | null | undefined>>,
) => {
  if (rows.length === 0) return;

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
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
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
  downloadCsvFile(`${safePrefix}_Bewertungsbogen.csv`, rows);
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

  downloadCsvFile(
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

  downloadCsvFile(`${safePrefix}_Klassenuebersicht.csv`, rows);
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

const openPrintPopup = (reports: PrintPayload[], filename?: string) => {
  const popup = window.open("", "_blank", "width=1024,height=1400");
  if (!popup) return false;
  popup.opener = null;

  const documentTitle = buildPrintDocumentTitle(filename);

  popup.document.write(`
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
        <script>
          const waitForImages = () => {
            const images = Array.from(document.images);
            if (images.length === 0) return Promise.resolve();

            return Promise.all(
              images.map((image) => {
                if (image.complete && image.naturalWidth > 0) return Promise.resolve();
                return new Promise((resolve) => {
                  const finish = () => resolve();
                  image.addEventListener("load", finish, { once: true });
                  image.addEventListener("error", finish, { once: true });
                });
              }),
            );
          };

          window.onload = async () => {
            await waitForImages();
            window.setTimeout(() => window.print(), 150);
          };
        </script>
      </body>
    </html>
  `);
  popup.document.close();
  return true;
};

export const openPrintWindow = (
  exam: Exam,
  summary: ExamSummary,
  identity?: PrintIdentity,
  options?: PrintOptions,
) => {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
  const alias = sanitizeFilenamePart(identity?.alias || "Bewertungsbogen");
  const filename = `${alias}_Bewertungsbogen_${timestamp}.pdf`;
  return openPrintPopup([{ exam, summary, identity, options }], filename);
};

export const openBatchPrintWindow = (reports: PrintPayload[]) => {
  if (reports.length === 0) return false;
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
  const className = sanitizeFilenamePart(reports[0]?.identity?.className || "Klasse");
  const filename = `${className}_${timestamp}.pdf`;
  return openPrintPopup(reports, filename);
};

export const openGradeScalePrintWindow = (
  exam: Exam,
  summary: ExamSummary,
  filenamePrefix?: string,
) => {
  const popup = window.open("", "_blank", "width=960,height=720");
  if (!popup) return false;
  popup.opener = null;

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
        <script>
          window.onload = () => {
            window.setTimeout(() => window.print(), 150);
          };
        </script>
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
  const popup = window.open("", "_blank", "width=1040,height=900");
  if (!popup) return false;
  popup.opener = null;

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
        <script>
          window.onload = () => {
            window.setTimeout(() => window.print(), 150);
          };
        </script>
      </body>
    </html>
  `);
  popup.document.close();
  return true;
};
