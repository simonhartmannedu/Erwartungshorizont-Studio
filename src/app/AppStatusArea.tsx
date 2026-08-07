import { DismissibleCallout } from "../components/ui";

export type AppNoticeTone = "info" | "warning" | "success" | "danger";

export type AppNotice = {
  id: number;
  tone: AppNoticeTone;
  title: string;
  detail?: string;
};

export const getDemoModeNoticeResetKey = (workspaceId: string) => `demo-${workspaceId}`;

type AppStatusAreaProps = {
  notice: AppNotice | null;
  isDemoModeEnabled: boolean;
  demoWorkspaceId: string;
  onResetDemoWorkspace: () => void;
};

/** Renders global non-sensitive status information using commands owned by App. */
export const AppStatusArea = ({
  notice,
  isDemoModeEnabled,
  demoWorkspaceId,
  onResetDemoWorkspace,
}: AppStatusAreaProps) => (
  <>
    {notice ? (
      <div className="mb-6 no-print">
        <DismissibleCallout tone={notice.tone} resetKey={notice.id}>
          <p className="font-semibold">{notice.title}</p>
          {notice.detail ? <p>{notice.detail}</p> : null}
        </DismissibleCallout>
      </div>
    ) : null}

    {isDemoModeEnabled ? (
      <div className="mb-6 no-print">
        <DismissibleCallout tone="info" resetKey={getDemoModeNoticeResetKey(demoWorkspaceId)}>
          <p className="font-semibold">Demo-Modus aktiv</p>
          <p>
            Diese GitHub-Pages-Demo lädt beim ersten Aufruf eine lokale Beispiel-Klassenarbeit. Alle Änderungen bleiben
            nur in diesem Browser.
          </p>
          <p className="mt-2">
            Die Demo-Lerngruppe kannst du entsperren: Klassenpasswort <code>demo</code>.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" className="button-secondary" onClick={onResetDemoWorkspace}>
              Demo-Daten zurücksetzen
            </button>
          </div>
        </DismissibleCallout>
      </div>
    ) : null}
  </>
);
