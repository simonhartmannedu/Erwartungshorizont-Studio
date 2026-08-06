import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import {
  appendWorkspaceVersion,
  createWorkspaceVersion,
  restoreWorkspaceVersionInBundle,
  type RestoreWorkspaceVersionCommand,
} from "../../domain/workspaces/versions";
import type { DraftBundle, Exam } from "../../types";

type WorkspaceVersionControllerOptions = {
  draftBundle: DraftBundle;
  setDraftBundle: Dispatch<SetStateAction<DraftBundle>>;
  lastVersionedExamByWorkspaceRef: MutableRefObject<Record<string, string>>;
  maxVersions: number;
  cloneExam: (exam: Exam) => Exam;
  normalizeExam: (exam: Exam) => Exam;
  onRestoreCompleted: () => void;
};

/** Commands for local workspace snapshots; persistence remains an App concern. */
export const useWorkspaceVersionController = ({
  draftBundle,
  setDraftBundle,
  lastVersionedExamByWorkspaceRef,
  maxVersions,
  cloneExam,
  normalizeExam,
  onRestoreCompleted,
}: WorkspaceVersionControllerOptions) => {
  const saveVersion = useCallback(
    (workspaceId: string) => {
      setDraftBundle((current) => {
        const workspace = current.workspaces.find((entry) => entry.id === workspaceId);
        if (!workspace) return current;

        const currentVersion = createWorkspaceVersion(
          workspace.exam,
          crypto.randomUUID(),
          new Date().toISOString(),
          cloneExam,
        );
        return appendWorkspaceVersion(current, workspaceId, currentVersion, maxVersions);
      });

      const workspace = draftBundle.workspaces.find((entry) => entry.id === workspaceId) ?? null;
      if (!workspace) return;

      lastVersionedExamByWorkspaceRef.current = {
        ...lastVersionedExamByWorkspaceRef.current,
        [workspaceId]: JSON.stringify(workspace.exam),
      };
    },
    [cloneExam, draftBundle.workspaces, lastVersionedExamByWorkspaceRef, maxVersions, setDraftBundle],
  );

  const restoreVersion = useCallback(
    (command: RestoreWorkspaceVersionCommand) => {
      setDraftBundle((current) =>
        restoreWorkspaceVersionInBundle(current, command, {
          maxVersions,
          createVersionId: () => crypto.randomUUID(),
          createTimestamp: () => new Date().toISOString(),
          cloneExam,
          normalizeExam,
        }),
      );

      lastVersionedExamByWorkspaceRef.current = {
        ...lastVersionedExamByWorkspaceRef.current,
        [command.workspaceId]: JSON.stringify(command.version.exam),
      };
      onRestoreCompleted();
    },
    [cloneExam, lastVersionedExamByWorkspaceRef, maxVersions, normalizeExam, onRestoreCompleted, setDraftBundle],
  );

  return { saveVersion, restoreVersion };
};
