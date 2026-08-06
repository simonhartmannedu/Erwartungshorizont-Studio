import type { DraftBundle } from "../../types";

export type WorkspaceContextPatch = {
  activeArchiveEntryId?: string | null;
  assignedGroupId?: string | null;
};

/** Updates only archive/group references of a workspace without changing its exam. */
export const updateWorkspaceContextInBundle = (
  bundle: DraftBundle,
  workspaceId: string | null,
  patch: WorkspaceContextPatch,
): DraftBundle => {
  if (!workspaceId) return bundle;

  return {
    ...bundle,
    workspaces: bundle.workspaces.map((workspace) =>
      workspace.id === workspaceId ? { ...workspace, ...patch } : workspace,
    ),
  };
};
