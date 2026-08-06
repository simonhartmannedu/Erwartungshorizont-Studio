import type { DraftBundle, DraftWorkspaceVersion, Exam } from "../../types";

export type RestoreWorkspaceVersionCommand = {
  workspaceId: string;
  version: DraftWorkspaceVersion;
};

type RestoreWorkspaceVersionOptions = {
  maxVersions: number;
  createVersionId: () => string;
  createTimestamp: () => string;
  cloneExam: (exam: Exam) => Exam;
  normalizeExam: (exam: Exam) => Exam;
};

export const createWorkspaceVersion = (
  exam: Exam,
  id: string,
  savedAt: string,
  cloneExam: (exam: Exam) => Exam,
): DraftWorkspaceVersion => ({
  id,
  savedAt,
  exam: cloneExam(exam),
});

export const appendWorkspaceVersion = (
  bundle: DraftBundle,
  workspaceId: string,
  version: DraftWorkspaceVersion,
  maxVersions: number,
): DraftBundle => ({
  ...bundle,
  workspaces: bundle.workspaces.map((workspace) =>
    workspace.id === workspaceId
      ? { ...workspace, versions: [version, ...workspace.versions].slice(0, maxVersions) }
      : workspace,
  ),
});

export const restoreWorkspaceVersionInBundle = (
  bundle: DraftBundle,
  command: RestoreWorkspaceVersionCommand,
  options: RestoreWorkspaceVersionOptions,
): DraftBundle => ({
  ...bundle,
  workspaces: bundle.workspaces.map((workspace) => {
    if (workspace.id !== command.workspaceId) return workspace;

    const currentSnapshot = createWorkspaceVersion(
      workspace.exam,
      options.createVersionId(),
      options.createTimestamp(),
      options.cloneExam,
    );

    return {
      ...workspace,
      exam: options.normalizeExam(options.cloneExam(command.version.exam)),
      updatedAt: options.createTimestamp(),
      versions: [currentSnapshot, ...workspace.versions.filter((version) => version.id !== command.version.id)].slice(
        0,
        options.maxVersions,
      ),
    };
  }),
});
