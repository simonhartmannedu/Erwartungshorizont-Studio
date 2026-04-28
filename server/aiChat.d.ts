import { AiChatResponse } from "../src/ai/types";
export declare const handleAiChatRequest: (payload: unknown) => Promise<{
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
    body: AiChatResponse;
}>;
