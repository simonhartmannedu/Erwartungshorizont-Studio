import { classifyPdfDataRisks, hasHighRiskFindings, PDF_CONSENT_VERSION, PDF_SUGGEST_PURPOSE } from "../src/pdf/privacy";
import { ImportedExamSuggestion, ImportedSectionDraft, ImportedTaskDraft, PdfServiceErrorResponse, PdfSuggestRequest, PdfSuggestResponse } from "../src/pdf/types";

const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const DEFAULT_TASK_POINTS = 5;
const MAX_TASKS_PER_SECTION = 12;
const MAX_SECTIONS = 8;
const STRUCTURE_NOTE = "Automatisch aus PDF vorgeschlagen; fachlich mit dem Original abgleichen.";

const isPdfSuggestRequest = (value: unknown): value is PdfSuggestRequest => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PdfSuggestRequest>;

  return (
    isNonEmptyString(candidate.extractedText) &&
    isNonEmptyString(candidate.filename) &&
    isNonEmptyString(candidate.consentVersion) &&
    isNonEmptyString(candidate.purpose) &&
    isNonEmptyString(candidate.timestamp) &&
    (candidate.documentKind === "exam" ||
      candidate.documentKind === "answerKey" ||
      candidate.documentKind === "studentSubmission" ||
      candidate.documentKind === "gradingRubric" ||
      candidate.documentKind === "mixed") &&
    (candidate.assistanceGoal === "structure_only" ||
      candidate.assistanceGoal === "language_focus" ||
      candidate.assistanceGoal === "content_focus" ||
      candidate.assistanceGoal === "combined_focus") &&
    (candidate.privacyMode === "already_anonymized" ||
      candidate.privacyMode === "minimize_strictly" ||
      candidate.privacyMode === "unsure_be_extra_careful") &&
    (candidate.answerStyle === "compact" ||
      candidate.answerStyle === "balanced" ||
      candidate.answerStyle === "very_cautious") &&
    (candidate.riskAcknowledged === undefined || typeof candidate.riskAcknowledged === "boolean")
  );
};

const createError = (status: number, code: string, message: string, details?: string[]) => ({
  status,
  body: {
    error: {
      code,
      message,
      details,
    },
  } satisfies PdfServiceErrorResponse,
});

const extractDate = (text: string) => {
  const match = text.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/);
  if (!match) return "";
  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  const year = match[3].length === 2 ? `20${match[3]}` : match[3];
  return `${year}-${month}-${day}`;
};

const extractMetaField = (text: string, labels: string[]) => {
  for (const label of labels) {
    const pattern = new RegExp(`${label}\\s*[:.-]?\\s*(.+)`, "i");
    const match = text.match(pattern);
    if (match?.[1]) return match[1].split("\n")[0].trim();
  }
  return "";
};

const cleanupLine = (value: string) => value.replace(/\s+/g, " ").trim();

const normalizeText = (text: string) => text.replace(/\f/g, "\n");

const sanitizeBlockText = (value: string) =>
  normalizeText(value)
    .split("\n")
    .map(cleanupLine)
    .filter(Boolean)
    .filter((line) => !isScoreNoiseLine(line) && !isAdministrativeNoiseLine(line))
    .join("\n");

const isAdministrativeNoiseLine = (line: string) =>
  /^(name|note|unterschrift|resultierende note|datum[, ]|gesamtpunktzahl|kriteriales bewertungsraster)$/i.test(line) ||
  /^q\d+\b/i.test(line) ||
  /^erwartungshorizont\b/i.test(line);

const isScoreNoiseLine = (line: string) =>
  /^(bewertungs-?\s*einheiten|klausur-?\s*punkte|max\.?|erreichte|punkt-?zahl|lösungsqualität)$/i.test(line) ||
  /^\d+\s*be\b/i.test(line) ||
  /^\d+\s*[-–]\s*\d+\b/.test(line);

const isSummaryLine = (line: string) =>
  /^(summe|gesamt(?:punktzahl|punkte| \(inhalt\)| \(darstellungsleistung\)| teil))/i.test(line);

const parseTrailingPoints = (line: string) => {
  const parenthesizedMatch = line.match(/\((\d{1,3})\)\s*$/);
  if (parenthesizedMatch) return Number(parenthesizedMatch[1]);
  const numberMatch = line.match(/(\d{1,3})\s*(?:p\.|be)?\s*$/i);
  if (!numberMatch) return null;
  const value = Number(numberMatch[1]);
  if (!Number.isFinite(value) || value > 300) return null;
  return value;
};

const stripTrailingPoints = (line: string) =>
  cleanupLine(line.replace(/\(?\d{1,3}\)?\s*(?:p\.|be)?\s*$/i, "").replace(/\s+[–-]\s*$/, ""));

const extractPercentage = (line: string) => {
  const match = line.match(/\((\d{1,3})%\)/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
};

const buildTask = (title: string, description: string, expectation: string, maxPoints: number | null): ImportedTaskDraft => ({
  title: title.trim(),
  description: description.trim(),
  expectation: expectation.trim() || "Mit dem Original-PDF fachlich abgleichen.",
  maxPoints: maxPoints && Number.isFinite(maxPoints) ? Math.max(0, maxPoints) : DEFAULT_TASK_POINTS,
});

const isSectionHeadingLine = (line: string) =>
  /^(klausurteil\s+[a-z]\b|teil\s+[a-z]\b)/i.test(line);

const getSectionHeading = (line: string) => {
  const explicitMatch = line.match(/^(Klausurteil\s+[A-Z])(?:\s*\((\d{1,3})%\))?\s*[:\-–]?\s*(.*)$/i);
  if (explicitMatch) {
    return {
      title: cleanupLine([explicitMatch[1], explicitMatch[3]].filter(Boolean).join(": ").replace(/:\s*$/, "")),
      percentage: explicitMatch[2] ? Number(explicitMatch[2]) : null,
    };
  }
  const simpleMatch = line.match(/^(Teil\s+[A-Z])\s*[:\-–]?\s*(.*)$/i);
  if (simpleMatch) {
    return {
      title: cleanupLine([simpleMatch[1], simpleMatch[2]].filter(Boolean).join(": ").replace(/:\s*$/, "")),
      percentage: extractPercentage(line),
    };
  }
  return null;
};

const isCategoryHeadingLine = (line: string) =>
  /^(?:\d+\.\s*)?(inhaltliche leistung|sprachliche leistung|sprachliche leistung\s*\/\s*darstellungsleistung|darstellungsleistung(?:\/sprachliche leistung)?|kommunikative textgestaltung|ausdrucksvermögen\s*\/\s*verfügbarkeit sprachlicher mittel|sprachrichtigkeit|inhaltspunkte)$/i.test(line);

const normalizeCategoryTitle = (line: string) =>
  cleanupLine(line.replace(/^\d+\.\s*/, "").replace(/\s*:\s*$/, ""));

const isTaskHeadingLine = (line: string) =>
  /^(teilaufgabe\s+\d+[a-z]?\b|task\s+\d+\b)/i.test(line) ||
  /^(comment|letter to the editor|analysis|summary|introductory sentence|short answers)\b/i.test(line);

const parseTaskHeading = (line: string, fallbackIndex: number) => {
  const teilaufgabeMatch = line.match(/^(Teilaufgabe\s+([0-9]+[a-z]?))(?:\s*\(([^)]+)\))?/i);
  if (teilaufgabeMatch) {
    return {
      title: teilaufgabeMatch[1],
      description: teilaufgabeMatch[3] ? cleanupLine(teilaufgabeMatch[3]) : `Aus der PDF erkannte ${teilaufgabeMatch[1]}.`,
      maxPoints: parseTrailingPoints(line),
    };
  }
  const genericTitle = cleanupLine(stripTrailingPoints(line)) || `Aufgabe ${fallbackIndex + 1}`;
  return {
    title: genericTitle,
    description: genericTitle,
    maxPoints: parseTrailingPoints(line),
  };
};

const summarizeLines = (lines: string[], maxLines: number, maxLength: number) =>
  lines
    .map(cleanupLine)
    .filter(Boolean)
    .slice(0, maxLines)
    .join(" ")
    .slice(0, maxLength);

const extractNumberedCriteriaTasks = (lines: string[]): ImportedTaskDraft[] => {
  const criterionIndices = lines.reduce<number[]>((indices, line, index) => {
    if (/^\d+\s+/.test(line) && !isSummaryLine(line)) {
      indices.push(index);
    }
    return indices;
  }, []);

  if (criterionIndices.length === 0) return [];

  return criterionIndices.slice(0, MAX_TASKS_PER_SECTION).map((startIndex, index) => {
    const endIndex = criterionIndices[index + 1] ?? lines.length;
    const blockLines = lines.slice(startIndex, endIndex).filter((line) => !isSummaryLine(line));
    const headingLine = cleanupLine(blockLines[0] ?? `Aufgabe ${index + 1}`);
    const headingMatch = headingLine.match(/^(\d+)\s+(.*)$/);
    const rawDescription = stripTrailingPoints(headingMatch?.[2] ?? headingLine);
    const expectation = summarizeLines(blockLines.slice(1), 8, 500);
    return buildTask(
      `Kriterium ${headingMatch?.[1] ?? index + 1}`,
      rawDescription || `Aus PDF erkanntes Kriterium ${index + 1}.`,
      expectation || rawDescription,
      parseTrailingPoints(headingLine),
    );
  });
};

const extractTasksFromBlock = (block: string): ImportedTaskDraft[] => {
  const lines = sanitizeBlockText(block)
    .split("\n")
    .map(cleanupLine)
    .filter(Boolean)
    .filter((line) => !/^anforderungen\b/i.test(line))
    .filter((line) => !/^der schüler|^die schülerin|^der prüfling/i.test(line));

  const taskIndices = lines.reduce<number[]>((indices, line, index) => {
    if (isTaskHeadingLine(line) || isCategoryHeadingLine(line)) {
      indices.push(index);
    }
    return indices;
  }, []);

  if (taskIndices.length > 0) {
    return taskIndices.slice(0, MAX_TASKS_PER_SECTION).map((startIndex, index) => {
      const endIndex = taskIndices[index + 1] ?? lines.length;
      const blockLines = lines.slice(startIndex, endIndex).filter((line) => !isSummaryLine(line));
      const heading = blockLines[0] ?? `Aufgabe ${index + 1}`;
      const headingMeta = isCategoryHeadingLine(heading)
        ? {
            title: normalizeCategoryTitle(heading),
            description: `Bewertungsbereich ${normalizeCategoryTitle(heading)}`,
            maxPoints: parseTrailingPoints(heading),
          }
        : parseTaskHeading(heading, index);
      const detailLines = blockLines.slice(1).filter((line) => !isCategoryHeadingLine(line));
      const summaryLine = blockLines.find(isSummaryLine) ?? null;
      return buildTask(
        headingMeta.title,
        headingMeta.description,
        summarizeLines(detailLines, 10, 700) || summarizeLines(blockLines, 4, 280),
        parseTrailingPoints(summaryLine ?? "") ?? headingMeta.maxPoints,
      );
    });
  }

  const criteriaTasks = extractNumberedCriteriaTasks(lines);
  if (criteriaTasks.length > 0) return criteriaTasks;

  const fallbackText = summarizeLines(lines, 8, 700);
  return [buildTask("Aufgabe 1", fallbackText || "Aus dem PDF wurde ein allgemeiner Aufgabenblock erkannt.", fallbackText, null)];
};

const extractSections = (text: string): ImportedSectionDraft[] => {
  const lines = normalizeText(text)
    .split("\n")
    .map(cleanupLine)
    .filter(Boolean);
  const sectionIndices = lines.reduce<number[]>((indices, line, index) => {
    if (isSectionHeadingLine(line)) {
      indices.push(index);
    }
    return indices;
  }, []);

  const sections = sectionIndices.slice(0, MAX_SECTIONS).map((startIndex, index) => {
    const endIndex = sectionIndices[index + 1] ?? lines.length;
    const blockLines = lines.slice(startIndex, endIndex);
    const rawHeading = blockLines[0] ?? `Teil ${index + 1}`;
    const heading = getSectionHeading(rawHeading);
    const summaryLine = blockLines.find(isSummaryLine) ?? "";
    const sectionWeight = heading?.percentage ?? extractPercentage(summaryLine) ?? 0;
    const tasks = extractTasksFromBlock(blockLines.join("\n"));
    return {
      title: heading?.title || rawHeading,
      description: summarizeLines(blockLines.slice(1).filter((line) => !isSummaryLine(line) && !isTaskHeadingLine(line)), 3, 220),
      note: STRUCTURE_NOTE,
      weight: sectionWeight,
      tasks,
    };
  });

  if (sections.length > 0) {
    const defaultWeight = Number((100 / sections.length).toFixed(1));
    const weights = sections.map((section) => section.weight);
    const hasExplicitWeights = weights.some((weight) => weight > 0);
    const totalWeight = hasExplicitWeights ? weights.reduce((sum, weight) => sum + weight, 0) || 1 : sections.length;
    return sections.map((section) => ({
      ...section,
      weight: hasExplicitWeights
        ? Number(((section.weight / totalWeight) * 100).toFixed(1))
        : defaultWeight,
      description: section.description || "Aus dem PDF erkannter Abschnitt.",
    }));
  }

  return [{
    title: "Importierter Abschnitt",
    description: cleanupLine(normalizeText(text).split("\n").slice(0, 3).join(" ")).slice(0, 180),
    note: STRUCTURE_NOTE,
    weight: 100,
    tasks: extractTasksFromBlock(text),
  }];
};

const buildSuggestion = (request: PdfSuggestRequest): ImportedExamSuggestion => ({
  meta: {
    title:
      extractMetaField(request.extractedText, ["Titel", "Klassenarbeit", "Klausur", "Thema"]) ||
      normalizeText(request.extractedText).split("\n").map(cleanupLine).filter(Boolean).slice(0, 2).join(" - ").slice(0, 120),
    unit: extractMetaField(request.extractedText, ["Unit", "Thema", "Unterrichtsvorhaben"]),
    course: extractMetaField(request.extractedText, ["Kurs", "Klasse", "Lerngruppe"]),
    gradeLevel: extractMetaField(request.extractedText, ["Jahrgang", "Stufe", "Klassenstufe"]),
    schoolYear: extractMetaField(request.extractedText, ["Schuljahr"]),
    examDate: extractDate(request.extractedText),
    notes: "Importvorschlag aus PDF. Struktur, Punkte und Formulierungen vor der Übernahme fachlich prüfen.",
  },
  sections: extractSections(request.extractedText),
  reviewNotes: [
    "Der Vorschlag wird aus dem PDF-Text automatisch abgeleitet.",
    "Summen-, Noten- und Randtabellen werden möglichst ausgeblendet, sollten aber manuell kontrolliert werden.",
    "Personenbezogene Inhalte und Bewertungswerte vor der Übernahme manuell prüfen.",
    "Bei schwer lesbaren Scan-PDFs oder ungewöhnlichen Layouts können Strukturfehler auftreten.",
  ],
});

export const handlePdfSuggestRequest = async (payload: unknown) => {
  if (!isPdfSuggestRequest(payload)) {
    return createError(400, "invalid_request", "Die Strukturvorschlag-Anfrage ist unvollständig oder ungültig.");
  }
  if (payload.consentVersion !== PDF_CONSENT_VERSION) {
    return createError(400, "consent_version_mismatch", "Die Einwilligungsversion ist veraltet.");
  }
  if (payload.purpose !== PDF_SUGGEST_PURPOSE) {
    return createError(400, "purpose_mismatch", "Die Anfrage wurde mit einem unzulässigen Zweck gesendet.");
  }

  const findings = classifyPdfDataRisks(payload.extractedText);
  if (findings.length > 0 && !payload.riskAcknowledged) {
    return createError(
      422,
      "sensitive_content_detected",
      "Die PDF enthält potenziell sensible Inhalte. Ohne ausdrückliche Bestätigung wird kein Strukturvorschlag erzeugt.",
      findings.map((finding) => finding.message),
    );
  }

  const response: PdfSuggestResponse = {
    suggestion: buildSuggestion(payload),
    warnings: findings.length > 0
      ? [
          "Die PDF enthielt sensible Muster; der Vorschlag wurde nur nach ausdrücklicher Bestätigung erzeugt.",
          hasHighRiskFindings(findings)
            ? "Hochrisiko-Muster erkannt. Bitte personenbezogene Inhalte vor der Übernahme besonders sorgfältig prüfen."
            : "Bitte numerische Kennungen und Detailangaben auf Erforderlichkeit prüfen.",
        ]
      : [],
    findings: findings.map((finding) => ({ type: finding.type, severity: finding.severity })),
  };

  return {
    status: 200,
    body: response,
  };
};
