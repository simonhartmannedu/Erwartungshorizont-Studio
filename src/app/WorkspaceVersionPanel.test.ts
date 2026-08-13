import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { DraftWorkspace } from "../types";
import { WorkspaceVersionPanel } from "./WorkspaceVersionPanel";

const workspace = {
  id: "workspace-test",
  label: "Fiktive Klassenarbeit",
  updatedAt: "2026-08-06T09:00:00.000Z",
  versions: [{ id: "version-test", savedAt: "2026-08-06T08:00:00.000Z", exam: {} }],
} as DraftWorkspace;

describe("WorkspaceVersionPanel", () => {
  it("summarizes collapsed local EWH versions", () => {
    const markup = renderToStaticMarkup(
      createElement(WorkspaceVersionPanel, {
        workspace,
        workspaceLabel: workspace.label,
        collapsed: true,
        maxVersions: 10,
        onToggleCollapsed: () => undefined,
        onSaveVersion: () => undefined,
        onRestoreVersion: () => undefined,
      }),
    );

    expect(markup).toContain("1 gespeicherte EWH-Version");
    expect(markup).toContain("Aktuellen EWH als Version speichern");
    expect(markup).toContain("Schülerpunkte gehören nicht dazu");
  });

  it("shows a restore action when snapshots are expanded", () => {
    const markup = renderToStaticMarkup(
      createElement(WorkspaceVersionPanel, {
        workspace,
        workspaceLabel: workspace.label,
        collapsed: false,
        maxVersions: 10,
        onToggleCollapsed: () => undefined,
        onSaveVersion: () => undefined,
        onRestoreVersion: () => undefined,
      }),
    );

    expect(markup).toContain("Wiederherstellen");
    expect(markup).toContain("Version 1");
  });
});
