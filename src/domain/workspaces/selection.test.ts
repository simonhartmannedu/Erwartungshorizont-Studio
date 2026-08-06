import { describe, expect, it } from "vitest";
import type { DraftBundle } from "../../types";
import { selectWorkspaceInBundle } from "./selection";

const bundle = {
  activeWorkspaceId: "workspace-1",
  workspaces: [{ id: "workspace-1" }, { id: "workspace-2" }],
} as DraftBundle;

describe("Workspace-Auswahl", () => {
  it("records the requested selection without mutating workspace data", () => {
    const next = selectWorkspaceInBundle(bundle, "workspace-2");

    expect(next).not.toBe(bundle);
    expect(next.activeWorkspaceId).toBe("workspace-2");
    expect(next.workspaces).toBe(bundle.workspaces);
    expect(bundle.activeWorkspaceId).toBe("workspace-1");
  });

  it("preserves an unknown requested ID for the existing fallback rules", () => {
    expect(selectWorkspaceInBundle(bundle, "workspace-importing").activeWorkspaceId).toBe("workspace-importing");
  });
});
