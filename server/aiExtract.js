import { AI_CHAT_CONSENT_VERSION, AI_CHAT_DISCLAIMER_LINES } from "../src/ai/constants";
import { classifyDataRisks, hasHighRiskFindings } from "../src/ai/classification";
import { AI_EXTRACT_PURPOSE } from "../src/pdf/constants";
import { createAiSuggestion } from "./providerRuntime.mjs";
const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
const isAiExtractRequest = (value) => {
    if (!value || typeof value !== "object")
        return false;
    const candidate = value;
    return (isNonEmptyString(candidate.extractedText) &&
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
            candidate.assistanceGoal === "language_feedback" ||
            candidate.assistanceGoal === "content_feedback" ||
            candidate.assistanceGoal === "combined_feedback") &&
        (candidate.privacyMode === "already_anonymized" ||
            candidate.privacyMode === "minimize_strictly" ||
            candidate.privacyMode === "unsure_be_extra_careful") &&
        (candidate.answerStyle === "compact" ||
            candidate.answerStyle === "balanced" ||
            candidate.answerStyle === "very_cautious") &&
        (candidate.riskAcknowledged === undefined || typeof candidate.riskAcknowledged === "boolean"));
};
const createError = (status, code, message, details) => ({
    status,
    body: {
        error: {
            code,
            message,
            details,
        },
    },
});
const extractDate = (text) => {
    const match = text.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/);
    if (!match)
        return "";
    const day = match[1].padStart(2, "0");
    const month = match[2].padStart(2, "0");
    const year = match[3].length === 2 ? `20${match[3]}` : match[3];
    return `${year}-${month}-${day}`;
};
const extractMetaField = (text, labels) => {
    for (const label of labels) {
        const pattern = new RegExp(`${label}\\s*[:.-]?\\s*(.+)`, "i");
        const match = text.match(pattern);
        if (match?.[1]) {
            return match[1].split("\n")[0].trim();
        }
    }
    return "";
};
const cleanupLine = (value) => value.replace(/\s+/g, " ").trim();
const extractTasksFromBlock = (block) => {
    const taskMatches = Array.from(block.matchAll(/(?:^|\n)\s*(?:aufgabe|teilaufgabe|task)\s*([\dA-Za-z]+)?[:.) -]*([^\n]{0,120})/gi));
    if (taskMatches.length === 0) {
        const lines = block
            .split("\n")
            .map(cleanupLine)
            .filter((line) => line.length > 0)
            .slice(0, 4);
        return lines.length > 0
            ? lines.map((line, index) => ({
                title: `Aufgabe ${index + 1}`,
                description: line,
                expectation: "Fachlich prüfen und mit dem Original-PDF abgleichen.",
                maxPoints: 5,
            }))
            : [
                {
                    title: "Aufgabe 1",
                    description: cleanupLine(block).slice(0, 180),
                    expectation: "Fachlich prüfen und mit dem Original-PDF abgleichen.",
                    maxPoints: 5,
                },
            ];
    }
    return taskMatches.slice(0, 8).map((match, index, allMatches) => {
        const headline = cleanupLine(match[2] || `Aufgabe ${index + 1}`) || `Aufgabe ${index + 1}`;
        const start = match.index ?? 0;
        const end = index + 1 < allMatches.length ? allMatches[index + 1].index ?? block.length : block.length;
        const content = cleanupLine(block.slice(start, end)).slice(0, 280);
        return {
            title: `Aufgabe ${match[1] || index + 1}`,
            description: headline,
            expectation: content || "Fachlich prüfen und mit dem Original-PDF abgleichen.",
            maxPoints: 5,
        };
    });
};
const extractSections = (text) => {
    const sectionMatches = Array.from(text.matchAll(/(?:^|\n)\s*(?:teil|abschnitt|section)\s+([A-Z0-9]+)[:.) -]*([^\n]{0,120})/gim));
    const sections = sectionMatches.slice(0, 6).map((match, index, allMatches) => {
        const start = match.index ?? 0;
        const end = index + 1 < allMatches.length ? allMatches[index + 1].index ?? text.length : text.length;
        const block = text.slice(start, end).trim();
        const titleSuffix = cleanupLine(match[2] ?? "");
        return {
            title: titleSuffix ? `Teil ${match[1]}: ${titleSuffix}` : `Teil ${match[1]}`,
            description: cleanupLine(block.split("\n").slice(0, 2).join(" ")).slice(0, 180),
            note: "Automatisch aus PDF vorgeschlagen; fachlich und datenschutzrechtlich prüfen.",
            weight: 25,
            tasks: extractTasksFromBlock(block),
        };
    });
    if (sections.length > 0) {
        const totalWeight = sections.reduce((sum, section) => sum + section.weight, 0) || 1;
        return sections.map((section) => ({
            ...section,
            weight: Number(((section.weight / totalWeight) * 100).toFixed(1)),
        }));
    }
    return [
        {
            title: "Importierter Abschnitt",
            description: cleanupLine(text.split("\n").slice(0, 3).join(" ")).slice(0, 180),
            note: "Automatisch aus PDF vorgeschlagen; fachlich und datenschutzrechtlich prüfen.",
            weight: 100,
            tasks: extractTasksFromBlock(text),
        },
    ];
};
const buildSuggestion = (request) => ({
    meta: {
        title: extractMetaField(request.extractedText, ["Titel", "Klassenarbeit", "Klausur", "Thema"]),
        unit: extractMetaField(request.extractedText, ["Unit", "Thema", "Unterrichtsvorhaben"]),
        course: extractMetaField(request.extractedText, ["Kurs", "Klasse", "Lerngruppe"]),
        gradeLevel: extractMetaField(request.extractedText, ["Jahrgang", "Stufe", "Klassenstufe"]),
        schoolYear: extractMetaField(request.extractedText, ["Schuljahr"]),
        examDate: extractDate(request.extractedText),
        notes: "Importvorschlag aus PDF. Inhalte vor der Übernahme fachlich prüfen.",
    },
    sections: extractSections(request.extractedText),
    reviewNotes: [
        "Der Vorschlag ersetzt keine fachliche Korrekturentscheidung.",
        "Klarnamen, Bewertungswerte und personenbezogene Inhalte vor der Übernahme manuell prüfen.",
        "Bei Scan-PDFs ohne eingebetteten Text ist zusätzlich OCR erforderlich.",
    ],
});
export const handleAiExtractRequest = async (payload) => {
    if (!isAiExtractRequest(payload)) {
        return createError(400, "invalid_request", "Die PDF-Auswertungsanfrage ist unvollständig oder ungültig.");
    }
    if (payload.consentVersion !== AI_CHAT_CONSENT_VERSION) {
        return createError(400, "consent_version_mismatch", "Die Einwilligungsversion ist veraltet.");
    }
    if (payload.purpose !== AI_EXTRACT_PURPOSE) {
        return createError(400, "purpose_mismatch", "Die PDF-Anfrage wurde mit einem unzulässigen Zweck gesendet.");
    }
    const findings = classifyDataRisks(payload.extractedText);
    if (findings.length > 0 && !payload.riskAcknowledged) {
        return createError(422, "sensitive_content_detected", "Die PDF enthält potenziell sensible Inhalte. Ohne ausdrückliche Bestätigung wird kein Vorschlag erzeugt.", findings.map((finding) => finding.message));
    }
    let suggestion;
    try {
        suggestion = (await createAiSuggestion({
            request: payload,
            fallbackSuggestion: buildSuggestion(payload),
        }));
    }
    catch {
        suggestion = buildSuggestion(payload);
    }
    const response = {
        suggestion,
        warnings: findings.length > 0
            ? [
                "Die PDF enthielt sensible Muster; der Vorschlag wurde nur nach ausdrücklicher Bestätigung erzeugt.",
                hasHighRiskFindings(findings)
                    ? "Hochrisiko-Muster erkannt. Bitte personenbezogene Inhalte vor der Übernahme besonders sorgfältig prüfen."
                    : "Bitte numerische Kennungen und Detailangaben auf Erforderlichkeit prüfen.",
            ]
            : ["Wenn kein externer KI-Provider konfiguriert ist, wird ein lokaler Strukturvorschlag verwendet."],
        findings: findings.map((finding) => ({ type: finding.type, severity: finding.severity })),
        disclaimer: [...AI_CHAT_DISCLAIMER_LINES],
    };
    return {
        status: 200,
        body: response,
    };
};
