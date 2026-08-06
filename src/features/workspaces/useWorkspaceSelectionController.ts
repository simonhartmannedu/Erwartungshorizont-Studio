import { useCallback, type Dispatch, type SetStateAction } from "react";
import { selectWorkspaceInBundle } from "../../domain/workspaces/selection";
import type { DraftBundle } from "../../types";

type WorkspaceSelectionControllerOptions = {
  setDraftBundle: Dispatch<SetStateAction<DraftBundle>>;
  onWorkspaceSelected: () => void;
};

/** Workspace-selection command; persistence and fallback selection remain in App. */
export const useWorkspaceSelectionController = ({
  setDraftBundle,
  onWorkspaceSelected,
}: WorkspaceSelectionControllerOptions) => {
  const selectWorkspace = useCallback(
    (workspaceId: string) => {
      setDraftBundle((current) => selectWorkspaceInBundle(current, workspaceId));
      onWorkspaceSelected();
    },
    [onWorkspaceSelected, setDraftBundle],
  );

  return { selectWorkspace };
};
