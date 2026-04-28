import { AI_CHAT_CONSENT_VERSION, AI_CHAT_DISCLAIMER_LINES, AI_CHAT_PURPOSE } from "../src/ai/constants";
import { buildContextSummary, buildRiskInspectionText, classifyDataRisks, hasHighRiskFindings, prepareRedactedPreview } from "../src/ai/classification";
const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
const createRequestId = () => `ai-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const isBsiContext = (value) => {
    if (!value || typeof value !== "object")
        return false;
    const candidate = value;
    const maturityLevel = candidate.maturityLevel;
    return (typeof candidate.targetObject === "string" &&
        typeof candidate.protectionNeed === "string" &&
        typeof candidate.controlReference === "string" &&
        typeof candidate.measureReference === "string" &&
        typeof candidate.ismsPhase === "string" &&
        typeof candidate.question === "string" &&
        (maturityLevel === null ||
            maturityLevel === undefined ||
            maturityLevel === 1 ||
            maturityLevel === 2 ||
            maturityLevel === 3 ||
            maturityLevel === 4 ||
            maturityLevel === 5));
};
const isAiChatRequest = (value) => {
    if (!value || typeof value !== "object")
        return false;
    const candidate = value;
    return (isNonEmptyString(candidate.message) &&
        isNonEmptyString(candidate.consentVersion) &&
        isNonEmptyString(candidate.purpose) &&
        isNonEmptyString(candidate.timestamp) &&
        (candidate.context === undefined || isBsiContext(candidate.context)) &&
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
const buildMockReply = (request) => {
    const contextSummary = buildContextSummary(request.context);
    return [
        "Einordnung:",
        `Die Anfrage wird als fachliche Unterstützungsfrage zum Zweck "${AI_CHAT_PURPOSE}" behandelt.`,
        contextSummary ? `Kontext:\n${contextSummary}` : "Kontext: Es wurde kein zusätzlicher Strukturkontext mitgegeben.",
        "",
        "Vorschlag:",
        "1. Zielobjekt, Schutzbedarf und Control-/Maßnahmenbezug klar voneinander trennen.",
        "2. Den KI-Hinweis nur als vorbereitende Arbeitshilfe nutzen und gegen eure eigene Dokumentation prüfen.",
        "3. Für Grundschutz++/OSCAL sollten Annahmen, offene Punkte und Nachweise separat festgehalten werden.",
        "",
        "Prüfhinweise:",
        "- KI-Antworten dürfen keine eigenständige Compliance-Entscheidung ersetzen.",
        "- Ergebnisse sind im fachlichen Review freizugeben.",
        "- Bei personenbezogenen oder vertraulichen Daten ist eine minimierte bzw. redigierte Fassung zu verwenden.",
    ].join("\n");
};
export const handleAiChatRequest = async (payload) => {
    if (!isAiChatRequest(payload)) {
        return createError(400, "invalid_request", "Die Anfrage ist unvollständig oder hat ein ungültiges Format.");
    }
    if (payload.consentVersion !== AI_CHAT_CONSENT_VERSION) {
        return createError(400, "consent_version_mismatch", "Die Einwilligungsversion ist veraltet.");
    }
    if (payload.purpose !== AI_CHAT_PURPOSE) {
        return createError(400, "purpose_mismatch", "Die Anfrage wurde mit einem unzulässigen Zweck übermittelt.");
    }
    const findings = classifyDataRisks(buildRiskInspectionText(payload));
    if (findings.length > 0 && !payload.riskAcknowledged) {
        return createError(422, "sensitive_content_detected", "Die Anfrage enthält potenziell sensible Inhalte und wurde ohne ausdrückliche Bestätigung blockiert.", findings.map((finding) => finding.message));
    }
    const requestId = createRequestId();
    const redactedPreview = prepareRedactedPreview(payload.message);
    const response = {
        reply: buildMockReply(payload),
        warnings: findings.length > 0
            ? [
                "Die Anfrage enthielt sensible Muster und wurde nur nach ausdrücklicher Bestätigung verarbeitet.",
                hasHighRiskFindings(findings)
                    ? "Mindestens ein Hochrisiko-Muster wurde erkannt. Bitte fachlich und datenschutzrechtlich besonders sorgfältig prüfen."
                    : "Bitte prüfen, ob numerische Kennungen oder andere Kontextdaten weiter minimiert werden können.",
            ]
            : [],
        disclaimer: [...AI_CHAT_DISCLAIMER_LINES],
        audit: {
            requestId,
            timestamp: new Date().toISOString(),
            purpose: payload.purpose,
            findings: findings.map((finding) => ({ type: finding.type, severity: finding.severity })),
            // Für Audit-Zwecke wird nur ein redigierbarer Preview-Status zurückgegeben, kein Rohtext.
            redactionPrepared: redactedPreview !== payload.message,
        },
    };
    return {
        status: 200,
        body: response,
    };
};
