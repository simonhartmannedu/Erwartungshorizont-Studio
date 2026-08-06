import { describe, expect, it } from "vitest";
import type { DraftBundle, DraftWorkspace } from "../../types";
import { appendWorkspaceToBundle, getNextWorkspaceLabel, removeWorkspaceFromBundle } from "./lifecycle";

const workspace = (id: string) => ({ id, label: id }) as DraftWorkspace;

const bundle: DraftBundle = {
  activeWorkspaceId: "workspace-2",
  workspaces: [workspace("workspace-1"), workspace("workspace-2"), workspace("workspace-3")],
};

describe("Workspace-Lifecycle", () => {
  it("adds a workspace as the active workspace without mutating existing entries", () => {
    const next = appendWorkspaceToBundle(bundle, workspace("workspace-4"));

    expect(next.activeWorkspaceId).toBe("workspace-4");
    expect(next.workspaces.map((entry) => entry.id)).toEqual(["workspace-1", "workspace-2", "workspace-3", "workspace-4"]);
    expect(bundle.workspaces.map((entry) => entry.id)).toEqual(["workspace-1", "workspace-2", "workspace-3"]);
    expect(getNextWorkspaceLabel(bundle.workspaces)).toBe("Klassenarbeit 4");
  });

  it("selects the previous workspace after deleting the active workspace", () => {
    const next = removeWorkspaceFromBundle(bundle, "workspace-2");

    expect(next.activeWorkspaceId).toBe("workspace-1");
    expect(next.workspaces.map((entry) => entry.id)).toEqual(["workspace-1", "workspace-3"]);
  });

  it("does not delete the final workspace", () => {
    const singleWorkspaceBundle: DraftBundle = { activeWorkspaceId: "workspace-1", workspaces: [workspace("workspace-1")] };

    expect(removeWorkspaceFromBundle(singleWorkspaceBundle, "workspace-1")).toBe(singleWorkspaceBundle);
  });
});
