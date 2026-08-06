import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { appendWorkspaceToBundle, getNextWorkspaceLabel, removeWorkspaceFromBundle } from "../../domain/workspaces/lifecycle";
import type { DraftBundle, DraftWorkspace, Exam } from "../../types";

type AddWorkspaceOptions = {
  label?: string;
  activeArchiveEntryId?: string | null;
  assignedGroupId?: string | null;
};

type WorkspaceLifecycleControllerOptions = {
  activeGroupId: string;
  setDraftBundle: Dispatch<SetStateAction<DraftBundle>>;
  lastVersionedExamByWorkspaceRef: MutableRefObject<Record<string, string>>;
  normalizeExam: (exam: Exam) => Exam;
  createWorkspace: (
    exam: Exam,
    label: string,
    activeArchiveEntryId: string | null,
    assignedGroupId: string | null,
  ) => DraftWorkspace;
  onLifecycleChanged: () => void;
};

/** Add/remove commands for local workspaces; persistence remains owned by App. */
export const useWorkspaceLifecycleController = ({
  activeGroupId,
  setDraftBundle,
  lastVersionedExamByWorkspaceRef,
  normalizeExam,
  createWorkspace,
  onLifecycleChanged,
}: WorkspaceLifecycleControllerOptions) => {
  const addWorkspace = useCallback(
    (nextExam: Exam, options?: AddWorkspaceOptions) => {
      const normalizedExam = normalizeExam(nextExam);
      const workspaceId = crypto.randomUUID();

      setDraftBundle((current) => {
        const workspace = {
          ...createWorkspace(
            normalizedExam,
            options?.label ?? getNextWorkspaceLabel(current.workspaces),
            options?.activeArchiveEntryId ?? null,
            (options?.assignedGroupId ?? activeGroupId) || null,
          ),
          id: workspaceId,
        };
        return appendWorkspaceToBundle(current, workspace);
      });

      lastVersionedExamByWorkspaceRef.current = {
        ...lastVersionedExamByWorkspaceRef.current,
        [workspaceId]: JSON.stringify(normalizedExam),
      };
      onLifecycleChanged();
    },
    [activeGroupId, createWorkspace, lastVersionedExamByWorkspaceRef, normalizeExam, onLifecycleChanged, setDraftBundle],
  );

  const removeWorkspace = useCallback(
    (workspaceId: string) => {
      setDraftBundle((current) => removeWorkspaceFromBundle(current, workspaceId));

      const nextVersionedState = { ...lastVersionedExamByWorkspaceRef.current };
      delete nextVersionedState[workspaceId];
      lastVersionedExamByWorkspaceRef.current = nextVersionedState;
      onLifecycleChanged();
    },
    [lastVersionedExamByWorkspaceRef, onLifecycleChanged, setDraftBundle],
  );

  return { addWorkspace, removeWorkspace };
};
