import { PdfSuggestResponse } from "../src/pdf/types";
export declare const handlePdfSuggestRequest: (payload: unknown) => Promise<{
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
    body: PdfSuggestResponse;
}>;
