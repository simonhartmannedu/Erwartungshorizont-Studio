export const PDF_CONSENT_VERSION = "2026-04-26";
export const PDF_EXTRACT_PURPOSE = "EWH-Editor: PDF-Text- und OCR-Extraktion";
export const PDF_SUGGEST_PURPOSE = "EWH-Editor: PDF-Import mit Strukturvorschlag";
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN = /(?:(?:\+|00)\d{1,3}[\s./-]?)?(?:\(?\d{2,5}\)?[\s./-]?){2,}\d{2,5}\b/g;
const CREDENTIAL_PATTERN = /\b(?:password|passwort|token|api[_-]?key|secret|bearer|access[_-]?key|client[_-]?secret)\b/gi;
const LONG_NUMERIC_ID_PATTERN = /\b\d{8,}\b/g;
const uniqueBy = (items, getKey) => {
    const seen = new Set();
    return items.filter((item) => {
        const key = getKey(item);
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
};
const collectMatches = (text, pattern, factory) => Array.from(text.matchAll(pattern)).map((entry) => factory(entry[0]));
export const classifyPdfDataRisks = (text) => {
    if (!text.trim())
        return [];
    const findings = [
        ...collectMatches(text, EMAIL_PATTERN, (match) => ({
            type: "email",
            severity: "high",
            match,
            message: "E-Mail-Adresse erkannt. Personenbezug möglichst vor dem Import entfernen.",
        })),
        ...collectMatches(text, PHONE_PATTERN, (match) => ({
            type: "phone",
            severity: "high",
            match,
            message: "Telefonnummer erkannt. Direkte Kontaktdaten möglichst nicht weiterverarbeiten.",
        })),
        ...collectMatches(text, CREDENTIAL_PATTERN, (match) => ({
            type: "credential",
            severity: "high",
            match,
            message: "Hinweis auf Zugangsdaten oder Secrets erkannt. Solche Inhalte sollten nicht importiert werden.",
        })),
        ...collectMatches(text, LONG_NUMERIC_ID_PATTERN, (match) => ({
            type: "longNumericId",
            severity: "medium",
            match,
            message: "Lange numerische Kennung erkannt. Bitte prüfen, ob diese Angabe erforderlich ist.",
        })),
    ];
    return uniqueBy(findings, (item) => `${item.type}:${item.match.toLowerCase()}`);
};
export const preparePdfRedactedPreview = (text) => text
    .replace(EMAIL_PATTERN, "[REDACTED_EMAIL]")
    .replace(PHONE_PATTERN, "[REDACTED_PHONE]")
    .replace(CREDENTIAL_PATTERN, "[REDACTED_SECRET_HINT]")
    .replace(LONG_NUMERIC_ID_PATTERN, "[REDACTED_LONG_ID]");
export const hasHighRiskFindings = (findings) => findings.some((finding) => finding.severity === "high");
export const buildPdfRiskInspectionText = (request) => request.extractedText;
