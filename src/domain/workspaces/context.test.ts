import { describe, expect, it } from "vitest";
import type { DraftBundle, DraftWorkspace } from "../../types";
import { updateWorkspaceContextInBundle } from "./context";

const bundle: DraftBundle = {
  activeWorkspaceId: "workspace-1",
  workspaces: [
    {
      id: "workspace-1",
      activeArchiveEntryId: null,
      assignedGroupId: null,
    } as DraftWorkspace,
    {
      id: "workspace-2",
      activeArchiveEntryId: "archive-keep",
      assignedGroupId: "group-keep",
    } as DraftWorkspace,
  ],
};

describe("Workspace-Kontext", () => {
  it("assigns archive and group references without changing the exam or other workspaces", () => {
    const next = updateWorkspaceContextInBundle(bundle, "workspace-1", {
      activeArchiveEntryId: "archive-1",
      assignedGroupId: "group-1",
    });

    expect(next.workspaces[0]).toMatchObject({ activeArchiveEntryId: "archive-1", assignedGroupId: "group-1" });
    expect(next.workspaces[1]).toBe(bundle.workspaces[1]);
    expect(bundle.workspaces[0]).toMatchObject({ activeArchiveEntryId: null, assignedGroupId: null });
  });

  it("leaves the bundle unchanged when no active workspace exists", () => {
    expect(updateWorkspaceContextInBundle(bundle, null, { assignedGroupId: "group-1" })).toBe(bundle);
  });
});
