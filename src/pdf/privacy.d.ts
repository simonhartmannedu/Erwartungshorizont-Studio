import { DataRiskFinding, PdfSuggestRequest } from "./types";
export declare const PDF_CONSENT_VERSION = "2026-04-26";
export declare const PDF_EXTRACT_PURPOSE = "EWH-Editor: PDF-Text- und OCR-Extraktion";
export declare const PDF_SUGGEST_PURPOSE = "EWH-Editor: PDF-Import mit Strukturvorschlag";
export declare const classifyPdfDataRisks: (text: string) => DataRiskFinding[];
export declare const preparePdfRedactedPreview: (text: string) => string;
export declare const hasHighRiskFindings: (findings: DataRiskFinding[]) => boolean;
export declare const buildPdfRiskInspectionText: (request: Pick<PdfSuggestRequest, "extractedText">) => string;
