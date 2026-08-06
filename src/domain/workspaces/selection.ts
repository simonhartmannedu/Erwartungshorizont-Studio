import type { DraftBundle } from "../../types";

/** Records the requested workspace selection without changing workspace data. */
export const selectWorkspaceInBundle = (bundle: DraftBundle, workspaceId: string): DraftBundle => ({
  ...bundle,
  activeWorkspaceId: workspaceId,
});
