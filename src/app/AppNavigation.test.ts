import { describe, expect, it } from "vitest";
import { getTabButtonId, getTabPanelId, tabs } from "./AppNavigation";

describe("AppNavigation", () => {
  it("keeps stable IDs for every primary tab", () => {
    expect(tabs.map((tab) => tab.id)).toEqual(["groups", "guidedBuilder", "builder", "archive", "backup"]);
    expect(getTabButtonId("groups")).toBe("app-tab-groups");
    expect(getTabPanelId("backup")).toBe("app-tabpanel-backup");
  });
});
