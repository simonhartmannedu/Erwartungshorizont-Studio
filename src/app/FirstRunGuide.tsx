import type { KeyboardEvent, Ref } from "react";
import { CloseIcon } from "../components/icons";
import { IconButton } from "../components/ui";
import { TabIcon, tabs, type AppTabId } from "./AppNavigation";

export type FirstRunGuideStep = {
  tabId: AppTabId;
  title: string;
  eyebrow: string;
  body: string;
  actionLabel: string;
};

export const firstRunGuideSteps: FirstRunGuideStep[] = [
  {
    tabId: "groups",
    eyebrow: "1. Grundlage",
    title: "Lege zuerst deine Lerngruppe an",
    body:
      "Importiere Namen, entsperre sensible Bewertungsdaten nur bei Bedarf und wähle die Klasse aus, für die du korrigierst.",
    actionLabel: "Lerngruppen öffnen",
  },
  {
    tabId: "guidedBuilder",
    eyebrow: "2. Startpunkt",
    title: "Starte mit Template oder PDF",
    body:
      "Nutze eine Vorlage, einen PDF-Import oder eine leere Struktur. Das nimmt neuen Nutzern die Entscheidung ab, wo sie beginnen sollen.",
    actionLabel: "Templates öffnen",
  },
  {
    tabId: "builder",
    eyebrow: "3. Korrektur",
    title: "Bearbeite Erwartungen, Punkte und Notenlogik",
    body:
      "Im Editor entsteht der eigentliche Erwartungshorizont. Abschnittsnavigation, Skalierung und Notentabelle bleiben nah an der Arbeit.",
    actionLabel: "Editor öffnen",
  },
  {
    tabId: "archive",
    eyebrow: "4. Wiederverwendung",
    title: "Speichere fertige Horizonte im Archiv",
    body:
      "Das Archiv macht alte Arbeiten wiederverwendbar und reduziert späteres Suchen in Dateien oder Browser-Downloads.",
    actionLabel: "Archiv öffnen",
  },
  {
    tabId: "backup",
    eyebrow: "5. Sicherheit",
    title: "Sichere Arbeitsstände regelmäßig",
    body:
      "Backups und Wiederherstellungspunkte schützen lokale Browserdaten, bevor du geräteübergreifend oder im Schuljahrarchiv arbeitest.",
    actionLabel: "Backup öffnen",
  },
];

type FirstRunGuideProps = {
  open: boolean;
  dialogRef: Ref<HTMLDivElement>;
  titleRef: Ref<HTMLHeadingElement>;
  activeStep: FirstRunGuideStep;
  stepIndex: number;
  progressLabel: string;
  onDialogKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onClose: () => void;
  onActivateStepTarget: (tabId: AppTabId) => void;
  onStepChange: (stepIndex: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  onDismiss: () => void;
};

/** Presentational first-run dialog; focus, state and navigation stay in App. */
export const FirstRunGuide = ({
  open,
  dialogRef,
  titleRef,
  activeStep,
  stepIndex,
  progressLabel,
  onDialogKeyDown,
  onClose,
  onActivateStepTarget,
  onStepChange,
  onPrevious,
  onNext,
  onDismiss,
}: FirstRunGuideProps) => {
  if (!open) return null;

  return (
    <div className="guide-overlay fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6" role="presentation">
      <div
        ref={dialogRef}
        className="guide-panel panel w-full max-w-2xl border p-5 shadow-2xl sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="first-run-guide-title"
        aria-describedby="first-run-guide-description"
        onKeyDown={onDialogKeyDown}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="hero-kicker mb-3">{activeStep.eyebrow}</p>
            <h2 ref={titleRef} id="first-run-guide-title" className="themed-strong text-2xl font-semibold" tabIndex={-1}>
              {activeStep.title}
            </h2>
          </div>
          <IconButton onClick={onClose} title="Einführung schließen" className="px-2.5 py-2">
            <CloseIcon />
          </IconButton>
        </div>

        <p id="first-run-guide-description" className="themed-muted mt-4 text-sm leading-6">
          {activeStep.body}
        </p>

        <div className="guide-step-card mt-5 rounded-2xl border p-4">
          <div className="flex items-center gap-3">
            <span className="guide-step-icon" aria-hidden="true">
              <TabIcon id={activeStep.tabId} />
            </span>
            <div>
              <p className="label">Direkt zum Bereich</p>
              <p className="themed-strong text-sm font-semibold">
                {tabs.find((tab) => tab.id === activeStep.tabId)?.label}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="button-primary mt-4 w-full gap-2 sm:w-auto"
            onClick={() => onActivateStepTarget(activeStep.tabId)}
          >
            <TabIcon id={activeStep.tabId} />
            {activeStep.actionLabel}
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="guide-progress" aria-label={`Schritt ${progressLabel}`}>
            {firstRunGuideSteps.map((step, index) => (
              <button
                key={step.tabId}
                type="button"
                className={`guide-progress-dot ${index === stepIndex ? "guide-progress-dot-active" : ""}`}
                aria-label={`Schritt ${index + 1}: ${step.title}`}
                aria-current={index === stepIndex ? "step" : undefined}
                onClick={() => onStepChange(index)}
              />
            ))}
          </div>
          <span className="themed-muted text-xs font-semibold">{progressLabel}</span>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" className="button-secondary justify-center gap-2" onClick={onDismiss}>
            Nicht mehr anzeigen
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              className="button-secondary flex-1 justify-center sm:flex-none"
              onClick={onPrevious}
              disabled={stepIndex === 0}
            >
              Zurück
            </button>
            {stepIndex < firstRunGuideSteps.length - 1 ? (
              <button type="button" className="button-primary flex-1 justify-center sm:flex-none" onClick={onNext}>
                Weiter
              </button>
            ) : (
              <button type="button" className="button-primary flex-1 justify-center sm:flex-none" onClick={onDismiss}>
                Fertig
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
