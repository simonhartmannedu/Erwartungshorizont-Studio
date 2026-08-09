import { describe, expect, it } from "vitest";
import { classifyPdfDataRisks, preparePdfRedactedPreview } from "./privacy";

describe("PDF privacy inspection", () => {
  it("does not mistake a German date for a phone number", () => {
    expect(classifyPdfDataRisks("Klassenarbeit am 12.05.2026")).toEqual([]);
    expect(preparePdfRedactedPreview("Klassenarbeit am 12.05.2026")).toContain("12.05.2026");
  });

  it("still identifies and redacts a telephone number", () => {
    const findings = classifyPdfDataRisks("Rückfragen: 0211 1234567");
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ type: "phone", severity: "high" });
    expect(preparePdfRedactedPreview("Rückfragen: 0211 1234567")).toContain("[REDACTED_PHONE]");
  });
});
