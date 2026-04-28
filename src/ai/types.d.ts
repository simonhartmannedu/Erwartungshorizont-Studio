export type DataRiskType = "email" | "phone" | "credential" | "longNumericId";
export type DataRiskSeverity = "medium" | "high";
export type ChatRole = "user" | "assistant" | "system";
export interface BsiContext {
    targetObject: string;
    protectionNeed: string;
    controlReference: string;
    measureReference: string;
    ismsPhase: string;
    maturityLevel: 1 | 2 | 3 | 4 | 5 | null;
    question: string;
}
export interface ConsentState {
    accepted: boolean;
    version: string;
    acceptedAt: string | null;
}
export interface DataRiskFinding {
    type: DataRiskType;
    severity: DataRiskSeverity;
    match: string;
    message: string;
}
export interface AiChatRequest {
    message: string;
    consentVersion: string;
    purpose: string;
    timestamp: string;
    context?: BsiContext;
    riskAcknowledged?: boolean;
}
export interface AiChatAuditMetadata {
    requestId: string;
    timestamp: string;
    purpose: string;
    findings: Array<Pick<DataRiskFinding, "type" | "severity">>;
    redactionPrepared: boolean;
}
export interface AiChatResponse {
    reply: string;
    warnings: string[];
    disclaimer: string[];
    audit: AiChatAuditMetadata;
}
export interface AiChatErrorResponse {
    error: {
        code: string;
        message: string;
        details?: string[];
    };
}
export interface ChatMessage {
    id: string;
    role: ChatRole;
    content: string;
    createdAt: string;
    status?: "complete" | "error";
    disclaimer?: string[];
    warnings?: string[];
    audit?: AiChatAuditMetadata;
    context?: BsiContext;
}
