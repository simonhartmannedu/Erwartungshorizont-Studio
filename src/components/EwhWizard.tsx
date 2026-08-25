import { ArchiveIcon, CheckIcon, DashboardIcon, GroupIcon, KeyIcon, PlusIcon, ReportIcon, UploadIcon, WizardIcon } from "./icons";
import type { AppTabId } from "../app/AppNavigation";

type WizardStep = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  tip: string;
  icon: typeof WizardIcon;
};

const steps: WizardStep[] = [
  {
    id: "access",
    eyebrow: "Schritt 1 · Schutz festlegen",
    title: "Token oder Passwort wählen",
    description: "Lege für deine Lerngruppe einen sicheren Zugang fest. Ein automatisch erzeugtes Security-Token ist der schnellste Weg; alternativ kannst du ein eigenes Passwort vergeben.",
    tip: "Das Token wird nur beim Anlegen gezeigt – drucke die Karte oder bewahre es getrennt von der Klassenliste auf.",
    icon: KeyIcon,
  },
  {
    id: "import",
    eyebrow: "Schritt 2 · Klassenliste",
    title: "Klasse importieren oder anlegen",
    description: "Importiere eine CSV-, Excel- oder ODS-Liste. EWH erstellt die Lerngruppe und die Schülercodes automatisch. Für kleine Gruppen kannst du sie auch manuell anlegen.",
    tip: "Die Importvorlage steht direkt im Bereich „Lerngruppen“ bereit.",
    icon: UploadIcon,
  },
  {
    id: "choose",
    eyebrow: "Schritt 3 · Ausgangspunkt",
    title: "Neuen oder vorhandenen EWH wählen",
    description: "Erstelle einen neuen Erwartungshorizont aus Vorlage, PDF oder leerer Struktur. Liegt er bereits im Archiv, kannst du ihn dort öffnen und für die aktuelle Klassenarbeit verwenden.",
    tip: "Ein Archiv-Eintrag ist eine wiederverwendbare Vorlage; Bewertungen bleiben immer bei der Klassenarbeit.",
    icon: ArchiveIcon,
  },
  {
    id: "edit",
    eyebrow: "Schritt 4 · Feinabstimmung",
    title: "EWH bearbeiten",
    description: "Vervollständige Metadaten, Aufgaben, Erwartungshorizonte, Punkte und Notenschlüssel. Wähle in der Seitenleiste zuerst die Klasse, damit alles richtig zugeordnet wird.",
    tip: "Änderungen werden automatisch lokal im Browser gespeichert.",
    icon: DashboardIcon,
  },
  {
    id: "review",
    eyebrow: "Schritt 5 · Abschluss",
    title: "Ergebnis prüfen",
    description: "Wechsle in den Ergebnisbereich, um den fertigen EWH, Notenbereiche sowie Kommentar und Unterschrift zu kontrollieren. Optional speicherst du die Vorlage danach im Archiv.",
    tip: "Für persönliche Bewertungsbögen wählst du zusätzlich eine:n Schüler:in aus.",
    icon: CheckIcon,
  },
  {
    id: "print",
    eyebrow: "Schritt 6 · Ausgabe",
    title: "Drucken oder als PDF sichern",
    description: "Wähle im Abschlussbereich den gewünschten Inhalt – etwa leeren EWH, Schülerbogen oder Klassenübersicht – und erstelle daraus eine Druck-PDF oder eine Word-Datei.",
    tip: "Wenn dein Browser ein Popup blockiert, erlaube Popups für EWH und starte den Druck erneut.",
    icon: ReportIcon,
  },
];

type Props = {
  stepIndex: number;
  protectedGroupAvailable: boolean;
  classListAvailable: boolean;
  workspaceAvailable: boolean;
  archiveAvailable: boolean;
  onStepChange: (index: number) => void;
  onOpenTarget: (tabId: AppTabId, targetId?: string, editorSection?: "setup" | "tasks" | "result") => void;
};

const StepAction = ({ stepId, archiveAvailable, onOpenTarget }: Pick<Props, "archiveAvailable" | "onOpenTarget"> & { stepId: string }) => {
  if (stepId === "access") {
    return <button type="button" className="button-primary gap-2" onClick={() => onOpenTarget("groups", "group-manual")}><KeyIcon />Zugangsschutz einrichten</button>;
  }
  if (stepId === "import") {
    return <div className="flex flex-wrap gap-2"><button type="button" className="button-primary gap-2" onClick={() => onOpenTarget("groups", "group-import")}><UploadIcon />Klassenliste importieren</button><button type="button" className="button-secondary gap-2" onClick={() => onOpenTarget("groups", "group-manual")}><GroupIcon />Klasse manuell anlegen</button></div>;
  }
  if (stepId === "choose") {
    return <div className="flex flex-wrap gap-2"><button type="button" className="button-primary gap-2" onClick={() => onOpenTarget("guidedBuilder")}><PlusIcon />Neuen EWH erstellen</button><button type="button" className="button-secondary gap-2" onClick={() => onOpenTarget("archive")} disabled={!archiveAvailable}><ArchiveIcon />EWH aus Archiv nutzen</button></div>;
  }
  if (stepId === "edit") {
    return <button type="button" className="button-primary gap-2" onClick={() => onOpenTarget("builder", undefined, "tasks")}><DashboardIcon />EWH-Editor öffnen</button>;
  }
  return <button type="button" className="button-primary gap-2" onClick={() => onOpenTarget("builder", undefined, "result")}><ReportIcon />Zum Abschlussbereich</button>;
};

export const EwhWizard = ({ stepIndex, protectedGroupAvailable, classListAvailable, workspaceAvailable, archiveAvailable, onStepChange, onOpenTarget }: Props) => {
  const activeIndex = Math.min(Math.max(stepIndex, 0), steps.length - 1);
  const activeStep = steps[activeIndex];
  const Icon = activeStep.icon;
  const statusByStep = [protectedGroupAvailable, classListAvailable, workspaceAvailable, workspaceAvailable, workspaceAvailable, false];

  return (
    <section className="ewh-wizard panel overflow-hidden border" aria-labelledby="ewh-wizard-title">
      <div className="ewh-wizard-hero p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="hero-kicker mb-3 inline-flex items-center gap-2"><WizardIcon />Geführter Ablauf</p>
            <h2 id="ewh-wizard-title" className="font-display themed-strong text-3xl">EWH-Wizard</h2>
            <p className="themed-muted mt-3 text-sm leading-6 sm:text-base">Von der geschützten Klassenliste bis zur druckfertigen Ausgabe – der Wizard führt dich durch den üblichen Ablauf und öffnet immer genau den passenden Arbeitsbereich.</p>
          </div>
          <span className="ewh-wizard-count">{activeIndex + 1} / {steps.length}</span>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[360px_minmax(0,1fr)]">
        <nav className="ewh-wizard-steps p-3 sm:p-5" aria-label="Schritte im EWH-Wizard">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const completed = statusByStep[index];
            return (
              <button key={step.id} type="button" className={`ewh-wizard-step ${index === activeIndex ? "ewh-wizard-step-active" : ""}`} aria-current={index === activeIndex ? "step" : undefined} onClick={() => onStepChange(index)}>
                <span className={`ewh-wizard-step-number ${completed ? "ewh-wizard-step-complete" : ""}`}>{completed ? <CheckIcon /> : index + 1}</span>
                <span className="ewh-wizard-step-copy">
                  <span className="ewh-wizard-step-title"><span className="ewh-wizard-step-icon"><StepIcon /></span><strong>{step.title}</strong></span>
                  <small>{completed ? "Bereit für den nächsten Schritt" : `Schritt ${index + 1} von ${steps.length}`}</small>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="ewh-wizard-content p-5 sm:p-8">
          <div key={activeStep.id} className="ewh-wizard-card">
            <span className="ewh-wizard-icon"><Icon /></span>
            <p className="hero-kicker mt-5">{activeStep.eyebrow}</p>
            <h3 className="themed-strong mt-2 text-2xl font-semibold">{activeStep.title}</h3>
            <p className="themed-muted mt-3 max-w-2xl text-sm leading-7 sm:text-base">{activeStep.description}</p>
            <aside className="ewh-wizard-tip mt-5"><strong>Tipp</strong><span>{activeStep.tip}</span></aside>
            <div className="mt-6"><StepAction stepId={activeStep.id} archiveAvailable={archiveAvailable} onOpenTarget={onOpenTarget} /></div>
          </div>
          <div className="mt-8 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" className="button-secondary justify-center" disabled={activeIndex === 0} onClick={() => onStepChange(activeIndex - 1)}>Zurück</button>
            {activeIndex < steps.length - 1 ? <button type="button" className="button-primary justify-center gap-2" onClick={() => onStepChange(activeIndex + 1)}>Weiter <span aria-hidden="true">→</span></button> : <button type="button" className="button-primary justify-center gap-2" onClick={() => onStepChange(0)}><WizardIcon />Von vorn beginnen</button>}
          </div>
        </div>
      </div>
    </section>
  );
};
