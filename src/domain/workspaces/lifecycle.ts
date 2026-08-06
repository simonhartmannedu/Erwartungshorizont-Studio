import type { DraftBundle, DraftWorkspace } from "../../types";

export const getNextWorkspaceLabel = (workspaces: DraftWorkspace[]) => `Klassenarbeit ${workspaces.length + 1}`;

export const appendWorkspaceToBundle = (bundle: DraftBundle, workspace: DraftWorkspace): DraftBundle => ({
  activeWorkspaceId: workspace.id,
  workspaces: [...bundle.workspaces, workspace],
});

export const removeWorkspaceFromBundle = (bundle: DraftBundle, workspaceId: string): DraftBundle => {
  if (bundle.workspaces.length <= 1) return bundle;

  const workspaceIndex = bundle.workspaces.findIndex((workspace) => workspace.id === workspaceId);
  const workspaces = bundle.workspaces.filter((workspace) => workspace.id !== workspaceId);
  const activeWorkspaceId =
    bundle.activeWorkspaceId === workspaceId
      ? workspaces[Math.max(0, workspaceIndex - 1)]?.id ?? workspaces[0]!.id
      : bundle.activeWorkspaceId;

  return { activeWorkspaceId, workspaces };
};
