import { PdfExtractRequest, PdfExtractResponse, PdfServiceErrorResponse, PdfSuggestRequest, PdfSuggestResponse } from "./types";

const isPdfServiceErrorResponse = (value: unknown): value is PdfServiceErrorResponse =>
  value !== null &&
  typeof value === "object" &&
  "error" in value &&
  typeof (value as PdfServiceErrorResponse).error?.code === "string" &&
  typeof (value as PdfServiceErrorResponse).error?.message === "string";

const isPdfSuggestResponse = (value: unknown): value is PdfSuggestResponse =>
  value !== null &&
  typeof value === "object" &&
  "suggestion" in value &&
  Array.isArray((value as PdfSuggestResponse).warnings);

export const requestPdfSuggestion = async (payload: PdfSuggestRequest): Promise<PdfSuggestResponse> => {
  const response = await fetch("/api/pdf-suggest", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    if (isPdfServiceErrorResponse(body)) {
      throw new Error(body.error.message);
    }

    throw new Error("Der Strukturvorschlag ist derzeit nicht verfügbar.");
  }

  if (!isPdfSuggestResponse(body)) {
    throw new Error("Der Strukturvorschlag hat ein unerwartetes Antwortformat geliefert.");
  }

  return body;
};

const isPdfExtractResponse = (value: unknown): value is PdfExtractResponse =>
  value !== null &&
  typeof value === "object" &&
  "extraction" in value &&
  typeof (value as PdfExtractResponse).extraction?.text === "string";

export const requestPdfExtraction = async (payload: PdfExtractRequest): Promise<PdfExtractResponse> => {
  const response = await fetch("/api/pdf-extract", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    if (isPdfServiceErrorResponse(body)) {
      throw new Error(body.error.message);
    }

    throw new Error("Die PDF konnte serverseitig nicht verarbeitet werden.");
  }

  if (!isPdfExtractResponse(body)) {
    throw new Error("Die PDF-Extraktion hat ein unerwartetes Antwortformat geliefert.");
  }

  return body;
};
