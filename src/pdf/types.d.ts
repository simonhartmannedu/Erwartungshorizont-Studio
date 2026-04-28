export type PdfDocumentKind = "exam" | "answerKey" | "studentSubmission" | "gradingRubric" | "mixed";
export type PdfAssistanceGoal = "structure_only" | "language_focus" | "content_focus" | "combined_focus";
export type PdfPrivacyMode = "already_anonymized" | "minimize_strictly" | "unsure_be_extra_careful";
export type PdfAnswerStyle = "compact" | "balanced" | "very_cautious";
export type PdfDataRiskType = "email" | "phone" | "credential" | "longNumericId";
export type PdfDataRiskSeverity = "medium" | "high";
export interface DataRiskFinding {
    type: PdfDataRiskType;
    severity: PdfDataRiskSeverity;
    match: string;
    message: string;
}
export interface PdfExtractionResult {
    text: string;
    pageCountHint: number | null;
    isLikelyScan: boolean;
    warnings: string[];
    usedOcr?: boolean;
    extractionMethod?: "embedded_text" | "ocr" | "none";
}
export interface ImportedTaskDraft {
    title: string;
    description: string;
    expectation: string;
    maxPoints: number;
}
export interface ImportedSectionDraft {
    title: string;
    description: string;
    note: string;
    weight: number;
    tasks: ImportedTaskDraft[];
}
export interface ImportedExamSuggestion {
    meta: {
        title: string;
        unit: string;
        course: string;
        gradeLevel: string;
        schoolYear: string;
        examDate: string;
        notes: string;
    };
    sections: ImportedSectionDraft[];
    reviewNotes: string[];
}
export interface PdfSuggestRequest {
    extractedText: string;
    filename: string;
    consentVersion: string;
    purpose: string;
    timestamp: string;
    documentKind: PdfDocumentKind;
    assistanceGoal: PdfAssistanceGoal;
    privacyMode: PdfPrivacyMode;
    answerStyle: PdfAnswerStyle;
    riskAcknowledged?: boolean;
}
export interface PdfSuggestResponse {
    suggestion: ImportedExamSuggestion;
    warnings: string[];
    findings: Array<Pick<DataRiskFinding, "type" | "severity">>;
}
export interface PdfServiceErrorResponse {
    error: {
        code: string;
        message: string;
        details?: string[];
    };
}
export interface PdfExtractRequest {
    fileName: string;
    fileContentBase64: string;
    consentVersion: string;
    purpose: string;
    timestamp: string;
}
export interface PdfExtractResponse {
    extraction: PdfExtractionResult;
}
