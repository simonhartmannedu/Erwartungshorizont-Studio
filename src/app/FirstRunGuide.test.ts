import { describe, expect, it } from "vitest";
import { firstRunGuideSteps } from "./FirstRunGuide";

describe("FirstRunGuide", () => {
  it("keeps the guided setup in the intended local-first order", () => {
    expect(firstRunGuideSteps.map((step) => step.tabId)).toEqual([
      "groups",
      "guidedBuilder",
      "builder",
      "archive",
      "backup",
    ]);
    expect(firstRunGuideSteps[firstRunGuideSteps.length - 1]?.actionLabel).toBe("Backup öffnen");
  });
});
