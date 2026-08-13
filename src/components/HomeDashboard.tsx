import {
  ArchiveIcon,
  CheckIcon,
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
  hasPreparedWorkspace: boolean;
  activeWorkspaceHasAssignedGroup: boolean;
  hasActiveGroup: boolean;
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
  backupTone: "info" | "warning" | "success" | "danger";
  lastBackupAt: string | null;
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
  hasPreparedWorkspace,
  activeWorkspaceHasAssignedGroup,
  hasActiveGroup,
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
  backupTone,
  lastBackupAt,
  recentWorkspaces,
  onNavigate,
  onOpenWorkspace,
  onQuickBackup,
}: HomeDashboardProps) => {
  const hasActiveWorkspace = Boolean(activeWorkspaceLabel);
  const correctionProgress = relevantStudentCount > 0 ? Math.round((correctedCount / relevantStudentCount) * 100) : 0;
  const today = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const groupIsReady = hasActiveGroup && activeGroupStudentCount > 0;
  const correctionIsComplete =
    activeWorkspaceHasAssignedGroup && relevantStudentCount > 0 && correctedCount >= relevantStudentCount;
  const workflowSteps: Array<{
    title: string;
    description: string;
    destination: HomeDestination;
    actionLabel: string;
    complete: boolean;
  }> = [
    {
      title: "Klassenliste vorbereiten",
      description: groupIsReady
        ? `${activeGroupStudentCount} Lernende sind in der aktiven Lerngruppe.`
        : hasActiveGroup
          ? "Füge noch Lernende hinzu oder importiere eine Klassenliste."
          : "Lege eine Lerngruppe an oder importiere eine Klassenliste.",
      destination: "groups",
      actionLabel: "Lerngruppe öffnen",
      complete: groupIsReady,
    },
    {
      title: "Erwartungshorizont anlegen",
      description: hasPreparedWorkspace
        ? "Die aktuelle Klassenarbeit hat einen eingerichteten Erwartungshorizont."
        : "Wähle eine Vorlage oder erstelle eine einfache Struktur.",
      destination: "guidedBuilder",
      actionLabel: "EWH erstellen",
      complete: hasPreparedWorkspace,
    },
    {
      title: "Klasse zuordnen",
      description: activeWorkspaceHasAssignedGroup
        ? "Punkte werden für die zugeordnete Lerngruppe gespeichert."
        : "Ordne diese Klassenarbeit einer Lerngruppe zu, bevor du korrigierst.",
      destination: "builder",
      actionLabel: "Im Editor zuordnen",
      complete: activeWorkspaceHasAssignedGroup,
    },
    {
      title: "Punkte eingeben",
      description: correctionIsComplete
        ? "Alle ausgewählten Schüler:innen sind korrigiert."
        : relevantStudentCount > 0
          ? `${correctedCount} von ${relevantStudentCount} Schüler:innen sind vollständig erfasst.`
          : "Öffne die Arbeit und wähle die bereits angelegten Schüler*innen aus.",
      destination: "builder",
      actionLabel: "Korrektur öffnen",
      complete: correctionIsComplete,
    },
    {
      title: "Ergebnisse sichern",
      description: lastBackupAt
        ? `Letztes Vollbackup: ${formatUpdate(lastBackupAt)}.`
        : "Erstelle ein verschlüsseltes Vollbackup außerhalb des Browsers.",
      destination: "backup",
      actionLabel: "Backup erstellen",
      complete: Boolean(lastBackupAt),
    },
  ];
  const currentWorkflowIndex = workflowSteps.findIndex((step) => !step.complete);
  const currentWorkflowStep = currentWorkflowIndex >= 0 ? workflowSteps[currentWorkflowIndex] : null;
  const nextStepDestination = currentWorkflowStep?.destination ?? "builder";
  const nextStepLabel = currentWorkflowStep?.actionLabel ?? "EWH bearbeiten";
  const backupNeedsAttention = backupTone === "warning" || backupTone === "danger";

  return (
    <section className="home-dashboard no-print" aria-label="Übersicht">
      <header className="home-page-header">
        <div>
          <p className="home-eyebrow">Arbeitsbereich</p>
          <h2>Übersicht</h2>
          <p>{today}</p>
        </div>
        <button type="button" className="button-primary gap-2" onClick={() => onNavigate(nextStepDestination)}>
          {nextStepDestination === "groups" ? <GroupIcon /> : <PlusIcon />} {nextStepLabel}
        </button>
      </header>

      <section className="home-workflow-panel" aria-labelledby="home-workflow-heading">
        <div className="home-panel-header">
          <div>
            <p className="home-eyebrow">Schritt für Schritt</p>
            <h3 id="home-workflow-heading">So bleibt eine Klassenarbeit übersichtlich</h3>
          </div>
          <span className="home-workflow-progress">
            {currentWorkflowStep ? `Jetzt: Schritt ${currentWorkflowIndex + 1}` : "Alles vorbereitet"}
          </span>
        </div>
        <ol className="home-workflow-list">
          {workflowSteps.map((step, index) => {
            const isCurrent = index === currentWorkflowIndex;
            return (
              <li key={step.title} className={`home-workflow-step${step.complete ? " is-complete" : ""}${isCurrent ? " is-current" : ""}`}>
                <span className="home-workflow-marker" aria-hidden="true">
                  {step.complete ? <CheckIcon className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.description}</p>
                  {isCurrent ? (
                    <button type="button" onClick={() => onNavigate(step.destination)}>
                      {step.actionLabel}<ChevronRightIcon className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
        <details className="home-data-guide">
          <summary>Was wird wo gespeichert?</summary>
          <div>
            <p><strong>Klassenarbeit:</strong> enthält Erwartungshorizont und die Ergebnisse der zugeordneten Lerngruppe.</p>
            <p><strong>Archiv:</strong> speichert nur die wiederverwendbare Vorlage, keine Schülerergebnisse.</p>
            <p><strong>Vollbackup:</strong> sichert Arbeitsstände, Archiv und Schülerdaten als verschlüsselte Datei außerhalb des Browsers.</p>
          </div>
        </details>
      </section>

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
              <div><strong>Dein nächster Erwartungshorizont beginnt hier.</strong><p>Wähle eine Vorlage, nutze eine PDF oder lege die Struktur selbst an.</p></div>
              <button type="button" onClick={() => onNavigate(nextStepDestination)}>{nextStepLabel} <ChevronRightIcon /></button>
            </div>
          )}
        </article>

        <aside className="home-status-stack" aria-label="Aktueller Status">
          <article className="home-status-card">
            <div className="home-status-icon"><GroupIcon className="h-4 w-4" /></div>
            <div className="home-status-copy"><p>Korrekturstand</p><strong>{relevantStudentCount ? `${correctedCount} / ${relevantStudentCount}` : "Noch offen"}</strong><span>{activeGroupStudentCount ? `${activeGroupStudentCount} Lernende in der aktiven Gruppe` : "Keine aktive Lerngruppe"}</span></div>
            {relevantStudentCount > 0 ? <div className="home-progress" aria-label={`${correctionProgress} Prozent korrigiert`}><i style={{ width: `${correctionProgress}%` }} /></div> : null}
          </article>
          <article className={`home-status-card home-status-card-backup home-status-card-backup-${backupTone}`}>
            <div className="home-status-icon"><SaveIcon className="h-4 w-4" /></div>
            <div className="home-status-copy"><p>Sicherung</p><strong>{backupSummary}</strong><span>{backupDetail}</span></div>
            <button type="button" onClick={onQuickBackup} aria-label={backupNeedsAttention ? "Jetzt Backup erstellen" : "Backup öffnen"}>
              <span>{backupNeedsAttention ? "Jetzt sichern" : "Backup"}</span><ChevronRightIcon />
            </button>
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
            <button type="button" onClick={() => onNavigate("guidedBuilder")}><TemplateIcon /><span>EWH erstellen</span></button>
            <button type="button" onClick={() => onNavigate("groups")}><GroupIcon /><span>Lerngruppen</span></button>
            <button type="button" onClick={() => onNavigate("archive")}><ArchiveIcon /><span>Archiv <em>{archiveCount}</em></span></button>
            <button type="button" onClick={onQuickBackup}><SaveIcon /><span>Backup</span></button>
          </div>
        </section>
      </div>
    </section>
  );
};
