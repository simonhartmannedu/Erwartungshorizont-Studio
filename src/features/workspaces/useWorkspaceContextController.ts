import { useCallback, type Dispatch, type SetStateAction } from "react";
import { updateWorkspaceContextInBundle } from "../../domain/workspaces/context";
import type { DraftBundle } from "../../types";

type WorkspaceContextControllerOptions = {
  activeWorkspaceId: string | null;
  setDraftBundle: Dispatch<SetStateAction<DraftBundle>>;
};

/** Commands for archive and group references of the currently active workspace. */
export const useWorkspaceContextController = ({
  activeWorkspaceId,
  setDraftBundle,
}: WorkspaceContextControllerOptions) => {
  const setArchiveEntryId = useCallback(
    (activeArchiveEntryId: string | null) => {
      setDraftBundle((current) => updateWorkspaceContextInBundle(current, activeWorkspaceId, { activeArchiveEntryId }));
    },
    [activeWorkspaceId, setDraftBundle],
  );

  const setAssignedGroupId = useCallback(
    (assignedGroupId: string | null) => {
      setDraftBundle((current) => updateWorkspaceContextInBundle(current, activeWorkspaceId, { assignedGroupId }));
    },
    [activeWorkspaceId, setDraftBundle],
  );

  return { setArchiveEntryId, setAssignedGroupId };
};
