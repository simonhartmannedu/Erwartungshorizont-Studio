import {
  ArchiveIcon,
  ChevronRightIcon,
  DashboardIcon,
  GroupIcon,
  PlusIcon,
  SaveIcon,
  TemplateIcon,
} from "./icons";

type HomeDestination = "guidedBuilder" | "builder" | "groups" | "archive" | "backup";

export type RecentWorkspace = {
  id: string;
  label: string;
  meta: string;
  updatedAt: string;
  isActive: boolean;
};

type HomeDashboardProps = {
  activeWorkspaceLabel: string | null;
  activeWorkspaceUpdatedAt: string | null;
  activeGroupLabel: string | null;
  activeGroupStudentCount: number;
  workspaceCount: number;
  archiveCount: number;
  sectionCount: number;
  pointCount: number;
  correctedCount: number;
  relevantStudentCount: number;
  backupSummary: string;
  backupDetail: string;
  recentWorkspaces: RecentWorkspace[];
  onNavigate: (destination: HomeDestination) => void;
  onOpenWorkspace: (workspaceId: string) => void;
  onQuickBackup: () => void;
};

const formatUpdate = (value: string | null) => {
  if (!value) return "Noch nicht bearbeitet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Zuletzt bearbeitet";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

/** Action-led workspace overview with a deliberately restrained information hierarchy. */
export const HomeDashboard = ({
  activeWorkspaceLabel,
  activeWorkspaceUpdatedAt,
  activeGroupLabel,
  activeGroupStudentCount,
  workspaceCount,
  archiveCount,
  sectionCount,
  pointCount,
  correctedCount,
  relevantStudentCount,
  backupSummary,
  backupDetail,
  recentWorkspaces,
  onNavigate,
  onOpenWorkspace,
  onQuickBackup,
}: HomeDashboardProps) => {
  const hasActiveWorkspace = Boolean(activeWorkspaceLabel);
  const correctionProgress = relevantStudentCount > 0 ? Math.round((correctedCount / relevantStudentCount) * 100) : 0;
  const today = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <section className="home-dashboard no-print" aria-label="Übersicht">
      <header className="home-page-header">
        <div>
          <p className="home-eyebrow">Arbeitsbereich</p>
          <h2>Übersicht</h2>
          <p>{today}</p>
        </div>
        <button type="button" className="button-primary gap-2" onClick={() => onNavigate("guidedBuilder")}>
          <PlusIcon /> Neuen EWH erstellen
        </button>
      </header>

      <div className="home-primary-grid">
        <article className="home-work-card">
          <div className="home-panel-header">
            <div><p className="home-eyebrow">Weiterarbeiten</p><h3>Aktueller Arbeitsstand</h3></div>
            {hasActiveWorkspace ? <span className="home-live-badge"><i /> Aktiv</span> : null}
          </div>
          {hasActiveWorkspace ? (
            <>
              <button type="button" className="home-work-title" onClick={() => onNavigate("builder")}>
                {activeWorkspaceLabel}<ChevronRightIcon />
              </button>
              <div className="home-work-meta">
                <span>{activeGroupLabel ?? "Keine Lerngruppe zugeordnet"}</span>
                <span>{sectionCount} Bereiche</span>
                <span>{pointCount} Punkte</span>
              </div>
              <div className="home-work-footer"><span>Bearbeitet · {formatUpdate(activeWorkspaceUpdatedAt)}</span><button type="button" onClick={() => onNavigate("builder")}>Im Editor öffnen</button></div>
            </>
          ) : (
            <div className="home-empty-state">
              <div className="home-empty-icon"><TemplateIcon className="h-5 w-5" /></div>
              <div><strong>Dein nächster Erwartungshorizont beginnt hier.</strong><p>Wähle eine Vorlage oder lege einen EWH manuell an.</p></div>
              <button type="button" onClick={() => onNavigate("guidedBuilder")}>Vorlagen öffnen <ChevronRightIcon /></button>
            </div>
          )}
        </article>

        <aside className="home-status-stack" aria-label="Aktueller Status">
          <article className="home-status-card">
            <div className="home-status-icon"><GroupIcon className="h-4 w-4" /></div>
            <div className="home-status-copy"><p>Korrekturstand</p><strong>{relevantStudentCount ? `${correctedCount} / ${relevantStudentCount}` : "Noch offen"}</strong><span>{activeGroupStudentCount ? `${activeGroupStudentCount} Lernende in der aktiven Gruppe` : "Keine aktive Lerngruppe"}</span></div>
            {relevantStudentCount > 0 ? <div className="home-progress" aria-label={`${correctionProgress} Prozent korrigiert`}><i style={{ width: `${correctionProgress}%` }} /></div> : null}
          </article>
          <article className="home-status-card home-status-card-backup">
            <div className="home-status-icon"><SaveIcon className="h-4 w-4" /></div>
            <div className="home-status-copy"><p>Sicherung</p><strong>{backupSummary}</strong><span>{backupDetail}</span></div>
            <button type="button" onClick={onQuickBackup} aria-label="Backup jetzt erstellen"><ChevronRightIcon /></button>
          </article>
        </aside>
      </div>

      <div className="home-content-grid">
        <section className="home-list-panel">
          <div className="home-panel-header"><div><p className="home-eyebrow">Zuletzt bearbeitet</p><h3>Arbeitsstände</h3></div><span>{workspaceCount} gesamt</span></div>
          <div className="home-workspace-list">
            {recentWorkspaces.map((workspace) => (
              <button type="button" className={`home-workspace-row${workspace.isActive ? " home-workspace-row-active" : ""}`} key={workspace.id} onClick={() => onOpenWorkspace(workspace.id)}>
                <span className="home-workspace-mark"><DashboardIcon className="h-4 w-4" /></span>
                <span className="home-workspace-copy"><strong>{workspace.label}</strong><small>{workspace.meta}</small></span>
                <time dateTime={workspace.updatedAt}>{formatUpdate(workspace.updatedAt)}</time>
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </section>

        <section className="home-shortcuts-panel">
          <div className="home-panel-header"><div><p className="home-eyebrow">Schnellzugriff</p><h3>Verwalten</h3></div></div>
          <div className="home-shortcuts">
            <button type="button" onClick={() => onNavigate("guidedBuilder")}><TemplateIcon /><span>Vorlagen</span></button>
            <button type="button" onClick={() => onNavigate("groups")}><GroupIcon /><span>Lerngruppen</span></button>
            <button type="button" onClick={() => onNavigate("archive")}><ArchiveIcon /><span>Archiv <em>{archiveCount}</em></span></button>
            <button type="button" onClick={onQuickBackup}><SaveIcon /><span>Backup</span></button>
          </div>
        </section>
      </div>
    </section>
  );
};
