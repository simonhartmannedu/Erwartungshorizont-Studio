import { describe, expect, it } from "vitest";
import { getNavigationTabId, getTabButtonId, getTabPanelId, getVisibleTabs, tabs } from "./AppNavigation";

describe("AppNavigation", () => {
  it("keeps stable IDs for every primary tab", () => {
    expect(tabs.map((tab) => tab.id)).toEqual(["home", "builder", "groups", "archive", "backup"]);
    expect(getTabButtonId("home")).toBe("app-tab-home");
    expect(getTabButtonId("groups")).toBe("app-tab-groups");
    expect(getTabPanelId("backup")).toBe("app-tabpanel-backup");
  });

  it("limits Easy Mode to the active work area and maps contextual views to it", () => {
    expect(getVisibleTabs(true).map((tab) => tab.id)).toEqual(["builder"]);
    expect(getVisibleTabs(false)).toBe(tabs);
    expect(getNavigationTabId("guidedBuilder")).toBe("builder");
    expect(getNavigationTabId("wizard")).toBe("builder");
  });
});
