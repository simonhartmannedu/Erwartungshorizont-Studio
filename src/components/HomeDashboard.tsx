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

type HomeDashboardProps = {
  activeWorkspaceLabel: string | null;
  activeWorkspaceUpdatedAt: string | null;
  activeGroupLabel: string | null;
  activeGroupStudentCount: number;
  workspaceCount: number;
  archiveCount: number;
  snapshotCount: number;
  sectionCount: number;
  pointCount: number;
  correctedCount: number;
  relevantStudentCount: number;
  backupSummary: string;
  backupDetail: string;
  onNavigate: (destination: HomeDestination) => void;
};

const formatUpdate = (value: string | null) => {
  if (!value) return "Noch nicht bearbeitet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Zuletzt bearbeitet";
  return `Zuletzt bearbeitet · ${new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)}`;
};

/** A calm, action-focused landing page for the application. */
export const HomeDashboard = ({
  activeWorkspaceLabel,
  activeWorkspaceUpdatedAt,
  activeGroupLabel,
  activeGroupStudentCount,
  workspaceCount,
  archiveCount,
  snapshotCount,
  sectionCount,
  pointCount,
  correctedCount,
  relevantStudentCount,
  backupSummary,
  backupDetail,
  onNavigate,
}: HomeDashboardProps) => {
  const hasActiveWorkspace = Boolean(activeWorkspaceLabel);
  const correctionLabel = relevantStudentCount > 0
    ? `${correctedCount} von ${relevantStudentCount} korrigiert`
    : "Noch keine Korrektur offen";

  return (
    <section className="home-dashboard no-print" aria-label="Übersicht">
      <div className="home-hero">
        <div className="home-hero-copy">
          <p className="home-eyebrow">Dein Arbeitsbereich</p>
          <h2 className="home-title">Alles Wichtige.<br />Auf einen Blick.</h2>
          <p className="home-intro">
            Plane Erwartungshorizonte, organisiere Lerngruppen und behalte deinen Arbeitsstand im Blick.
          </p>
          <div className="home-hero-actions">
            <button type="button" className="button-primary gap-2" onClick={() => onNavigate(hasActiveWorkspace ? "builder" : "guidedBuilder")}>
              {hasActiveWorkspace ? <DashboardIcon /> : <PlusIcon />}
              {hasActiveWorkspace ? "Weiterarbeiten" : "Ersten EWH anlegen"}
            </button>
            <button type="button" className="home-text-action" onClick={() => onNavigate("guidedBuilder")}>
              Vorlage entdecken <ChevronRightIcon />
            </button>
          </div>
        </div>
        <div className="home-orbit" aria-hidden="true">
          <div className="home-orbit-ring home-orbit-ring-outer" />
          <div className="home-orbit-ring home-orbit-ring-inner" />
          <div className="home-orbit-core"><DashboardIcon className="h-10 w-10" /></div>
          <span className="home-orbit-dot home-orbit-dot-one" />
          <span className="home-orbit-dot home-orbit-dot-two" />
        </div>
      </div>

      <div className="home-overview-grid">
        <article className="home-current-card">
          <div className="home-card-heading">
            <div>
              <p className="home-eyebrow">Im Fokus</p>
              <h3>{activeWorkspaceLabel ?? "Bereit für deinen ersten Erwartungshorizont"}</h3>
            </div>
            <span className="home-status-dot" title={hasActiveWorkspace ? "Arbeitsstand vorhanden" : "Noch kein Arbeitsstand"} />
          </div>
          <p className="home-current-description">
            {hasActiveWorkspace
              ? `${activeGroupLabel ?? "Ohne zugeordnete Lerngruppe"} · ${sectionCount} Bereiche · ${pointCount} Punkte`
              : "Starte mit einer Vorlage oder erstelle deinen Erwartungshorizont Schritt für Schritt."}
          </p>
          <div className="home-current-footer">
            <span>{formatUpdate(activeWorkspaceUpdatedAt)}</span>
            <button type="button" className="home-arrow-button" onClick={() => onNavigate(hasActiveWorkspace ? "builder" : "guidedBuilder")} aria-label={hasActiveWorkspace ? "EWH im Editor öffnen" : "EWH-Vorlagen öffnen"}>
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        </article>

        <div className="home-stat-grid" aria-label="Aktuelle Zahlen">
          <div className="home-stat-card home-stat-card-primary"><strong>{workspaceCount}</strong><span>Arbeitsstände</span></div>
          <div className="home-stat-card"><strong>{activeGroupStudentCount}</strong><span>Lernende aktiv</span></div>
          <div className="home-stat-card"><strong>{archiveCount}</strong><span>im Archiv</span></div>
          <div className="home-stat-card"><strong>{snapshotCount}</strong><span>Versionen</span></div>
        </div>
      </div>

      <div className="home-section-heading">
        <div>
          <p className="home-eyebrow">Schnellzugriff</p>
          <h3>Womit möchtest du anfangen?</h3>
        </div>
        <p>Direkt zum passenden Arbeitsbereich.</p>
      </div>

      <div className="home-action-grid">
        <button type="button" className="home-action-card home-action-card-featured" onClick={() => onNavigate("guidedBuilder")}>
          <span className="home-action-icon"><TemplateIcon className="h-6 w-6" /></span>
          <span className="home-action-content"><strong>Vorlage finden</strong><small>Mit einer fundierten Vorlage schnell starten.</small></span>
          <ChevronRightIcon className="home-action-chevron" />
        </button>
        <button type="button" className="home-action-card" onClick={() => onNavigate("groups")}>
          <span className="home-action-icon"><GroupIcon className="h-6 w-6" /></span>
          <span className="home-action-content"><strong>Lerngruppen</strong><small>{activeGroupLabel ?? "Klassen und Lernende verwalten."}</small></span>
          <ChevronRightIcon className="home-action-chevron" />
        </button>
        <button type="button" className="home-action-card" onClick={() => onNavigate("archive")}>
          <span className="home-action-icon"><ArchiveIcon className="h-6 w-6" /></span>
          <span className="home-action-content"><strong>Archiv</strong><small>Bewährte Erwartungshorizonte wiederverwenden.</small></span>
          <ChevronRightIcon className="home-action-chevron" />
        </button>
        <button type="button" className="home-action-card" onClick={() => onNavigate("backup")}>
          <span className="home-action-icon"><SaveIcon className="h-6 w-6" /></span>
          <span className="home-action-content"><strong>Datensicherung</strong><small>Deine lokalen Daten geschützt behalten.</small></span>
          <ChevronRightIcon className="home-action-chevron" />
        </button>
      </div>

      <div className="home-bottom-grid">
        <article className="home-insight-card">
          <div className="home-insight-icon"><GroupIcon className="h-5 w-5" /></div>
          <div><p className="home-eyebrow">Korrekturstand</p><h3>{correctionLabel}</h3><p>Für die aktuell ausgewählte Lerngruppe und Klassenarbeit.</p></div>
        </article>
        <article className="home-insight-card home-backup-card">
          <div className="home-insight-icon"><SaveIcon className="h-5 w-5" /></div>
          <div><p className="home-eyebrow">Sicherung</p><h3>{backupSummary}</h3><p>{backupDetail}</p></div>
          <button type="button" className="home-inline-link" onClick={() => onNavigate("backup")}>Öffnen</button>
        </article>
      </div>
    </section>
  );
};
