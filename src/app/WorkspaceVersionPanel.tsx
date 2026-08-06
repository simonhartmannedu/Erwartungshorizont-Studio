import { ChevronDownIcon, ChevronRightIcon, SaveIcon } from "../components/icons";
import { IconButton } from "../components/ui";
import type { DraftWorkspace, DraftWorkspaceVersion } from "../types";
import { formatDateTime } from "../utils/format";

type WorkspaceVersionPanelProps = {
  workspace: DraftWorkspace;
  workspaceLabel: string;
  collapsed: boolean;
  maxVersions: number;
  onToggleCollapsed: () => void;
  onSaveVersion: () => void;
  onRestoreVersion: (version: DraftWorkspaceVersion) => void;
};

/** Workspace-version presentation; commands and state remain owned by App. */
export const WorkspaceVersionPanel = ({
  workspace,
  workspaceLabel,
  collapsed,
  maxVersions,
  onToggleCollapsed,
  onSaveVersion,
  onRestoreVersion,
}: WorkspaceVersionPanelProps) => (
  <section className="workspace-version-drawer mt-3 rounded-2xl border p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="label">Versionsverlauf</p>
        <p className="themed-strong text-sm font-semibold">{workspaceLabel}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="themed-muted text-xs font-semibold">{workspace.versions.length} / {maxVersions}</span>
        <IconButton onClick={onSaveVersion} title="Schnappschuss jetzt speichern" className="px-2.5 py-2 text-xs">
          <SaveIcon />
        </IconButton>
        <IconButton onClick={onToggleCollapsed} title="Versionsverlauf schließen" className="px-2.5 py-2 text-xs">
          {collapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
        </IconButton>
      </div>
    </div>
    {collapsed ? (
      <p className="themed-muted mt-3 text-sm">
        {workspace.versions.length > 0
          ? `${workspace.versions.length} gespeicherte Schnappschüsse`
          : "Noch keine gespeicherten Schnappschüsse"}
      </p>
    ) : workspace.versions.length > 0 ? (
      <div className="mt-3 space-y-2">
        {workspace.versions.map((version, index) => (
          <div key={version.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2">
            <div>
              <p className="themed-strong text-sm font-medium">Version {workspace.versions.length - index}</p>
              <p className="themed-muted text-xs">{formatDateTime(version.savedAt)}</p>
            </div>
            <button type="button" className="button-secondary px-3 py-2 text-xs" onClick={() => onRestoreVersion(version)}>
              Wiederherstellen
            </button>
          </div>
        ))}
      </div>
    ) : (
      <p className="themed-muted mt-3 text-sm">Noch keine gespeicherten Versionen vorhanden.</p>
    )}
  </section>
);
