import { describe, expect, it } from "vitest";
import { getTabButtonId, getTabPanelId, getVisibleTabs, tabs } from "./AppNavigation";

describe("AppNavigation", () => {
  it("keeps stable IDs for every primary tab", () => {
    expect(tabs.map((tab) => tab.id)).toEqual(["home", "wizard", "groups", "guidedBuilder", "builder", "archive", "backup"]);
    expect(getTabButtonId("home")).toBe("app-tab-home");
    expect(getTabButtonId("groups")).toBe("app-tab-groups");
    expect(getTabPanelId("backup")).toBe("app-tabpanel-backup");
  });

  it("limits Easy Mode to the EWH workflow", () => {
    expect(getVisibleTabs(true).map((tab) => tab.id)).toEqual(["guidedBuilder", "builder"]);
    expect(getVisibleTabs(false)).toBe(tabs);
  });
});
