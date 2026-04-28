import { AiChatRequest, BsiContext, DataRiskFinding } from "./types";
export declare const buildContextSummary: (context?: BsiContext) => string;
export declare const buildRiskInspectionText: (request: Pick<AiChatRequest, "message" | "context">) => string;
export declare const classifyDataRisks: (text: string) => DataRiskFinding[];
export declare const prepareRedactedPreview: (text: string) => string;
export declare const hasHighRiskFindings: (findings: DataRiskFinding[]) => boolean;
