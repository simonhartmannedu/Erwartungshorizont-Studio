import { AiExtractResponse } from "../src/pdf/types";
export declare const handleAiExtractRequest: (payload: unknown) => Promise<{
    status: number;
    body: {
        error: {
            code: string;
            message: string;
            details: string[];
        };
    };
} | {
    status: number;
    body: AiExtractResponse;
}>;
