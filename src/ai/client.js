const isAiChatErrorResponse = (value) => value !== null &&
    typeof value === "object" &&
    "error" in value &&
    typeof value.error?.code === "string" &&
    typeof value.error?.message === "string";
const isAiChatResponse = (value) => value !== null &&
    typeof value === "object" &&
    typeof value.reply === "string" &&
    Array.isArray(value.warnings) &&
    Array.isArray(value.disclaimer) &&
    typeof value.audit?.requestId === "string";
export const sendAiChatRequest = async (payload) => {
    const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
    const body = (await response.json().catch(() => null));
    if (!response.ok) {
        if (isAiChatErrorResponse(body)) {
            throw new Error(body.error.message);
        }
        throw new Error("Die KI-Schnittstelle ist derzeit nicht verfügbar.");
    }
    if (!isAiChatResponse(body)) {
        throw new Error("Die KI-Schnittstelle hat ein unerwartetes Antwortformat geliefert.");
    }
    return body;
};
