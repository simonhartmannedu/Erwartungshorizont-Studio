import { describe, expect, it } from "vitest";
import { getDemoModeNoticeResetKey } from "./AppStatusArea";

describe("AppStatusArea", () => {
  it("resets the demo notice when the active workspace changes", () => {
    expect(getDemoModeNoticeResetKey("workspace-a")).toBe("demo-workspace-a");
    expect(getDemoModeNoticeResetKey("workspace-b")).toBe("demo-workspace-b");
  });
});
