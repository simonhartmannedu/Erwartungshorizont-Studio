import { FullscreenExitIcon, FullscreenIcon, InfoIcon, MoonIcon, PaletteIcon, SettingsIcon, SunIcon } from "../components/icons";
import type { ThemeMode, VisualTheme } from "../types";

export const visualThemeOptions: { value: VisualTheme; label: string }[] = [
  { value: "pdf-report", label: "PDF-Report" },
  { value: "earth-paper", label: "Bernsteinzimmer" },
  { value: "nrw-trikolore", label: "NRW-Trikolore" },
  { value: "waldmeister-schorle", label: "Waldmeister-Schorle" },
  { value: "blaubeer-pommesbude", label: "Blaubeer-Pommesbude" },
  { value: "flieder-feierabend", label: "Flieder-Feierabend" },
  { value: "beamtensalon", label: "Beamtensalon" },
  { value: "barrierefrei", label: "Barrierefrei" },
  { value: "video-tutorial", label: "Video-Tutorial" },
];

export type GlobalSearchResult = {
  id: string;
  kind: "student" | "workspace";
  label: string;
  detail: string;
};

type AppHeaderProps = {
  currentSchoolYearPillLabel: string;
  visualTheme: VisualTheme;
  onVisualThemeChange: (theme: VisualTheme) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  isAppFullscreen: boolean;
  isFullscreenAvailable: boolean;
  onToggleAppFullscreen: () => void;
  onOpenUserGuide: () => void;
  showSelectionReminder: boolean;
  onShowSelectionReminderChange: (enabled: boolean) => void;
};

/** Presentational application header; state and persistence remain in App. */
export const AppHeader = ({
  currentSchoolYearPillLabel,
  visualTheme,
  onVisualThemeChange,
  theme,
  onToggleTheme,
  isAppFullscreen,
  isFullscreenAvailable,
  onToggleAppFullscreen,
  onOpenUserGuide,
  showSelectionReminder,
  onShowSelectionReminderChange,
}: AppHeaderProps) => (
  <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
    <div className="max-w-4xl">
      <p className="hero-kicker mb-3">Erwartungshorizont-Studio | NRW Edition</p>
      <div className="brand-header-lockup">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display themed-strong text-4xl md:text-5xl">Erwartungshorizont Studio</h1>
            <span className="school-year-pill">Schuljahr {currentSchoolYearPillLabel}</span>
          </div>
          <p className="themed-muted mt-4 max-w-3xl text-base leading-7">
            Erwartungshorizonte, erstellen und verwalten
          </p>
        </div>
      </div>
    </div>
    <div className="header-actions flex w-full flex-col gap-3 no-print sm:flex-row sm:flex-wrap sm:items-end sm:justify-end lg:w-auto lg:justify-self-end">
      <label className="block w-full min-w-0 sm:min-w-[170px] sm:w-auto">
        <span className="label inline-flex items-center gap-2">
          <PaletteIcon className="h-3.5 w-3.5" />
          Darstellung
        </span>
        <select
          className="field header-control"
          value={visualTheme}
          onChange={(event) => onVisualThemeChange(event.target.value as VisualTheme)}
        >
          {visualThemeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="button-secondary header-control w-full gap-2 sm:w-auto" onClick={onToggleTheme}>
        {theme === "light" ? <MoonIcon /> : <SunIcon />}
        {theme === "light" ? "Dunkel" : "Hell"}
      </button>
      <button
        type="button"
        className="button-secondary header-control w-full gap-2 sm:w-auto"
        onClick={onToggleAppFullscreen}
        disabled={!isFullscreenAvailable}
        title={isAppFullscreen ? "App-Vollbild verlassen" : "App im Vollbild öffnen"}
        aria-label={isAppFullscreen ? "App-Vollbild verlassen" : "App im Vollbild öffnen"}
      >
        {isAppFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
        <span>{isAppFullscreen ? "Vollbild aus" : "Vollbild"}</span>
      </button>
      <details className="header-settings w-full sm:w-auto">
        <summary className="button-secondary header-control w-full cursor-pointer list-none gap-2 sm:w-auto">
          <SettingsIcon />
          Einstellungen
        </summary>
        <div className="header-settings-panel mt-2 space-y-4 p-4">
          <div>
            <p className="label">Hilfen</p>
            <label className="mt-2 flex cursor-pointer items-start gap-3 text-sm leading-5">
              <input
                type="checkbox"
                className="mt-1"
                checked={showSelectionReminder}
                onChange={(event) => onShowSelectionReminderChange(event.target.checked)}
              />
              <span>
                <strong className="themed-strong block">Auswahl-Hinweis zeigen</strong>
                <span className="themed-muted">Erinnert bei der Live-Auswertung an Klasse und Schüler*in.</span>
              </span>
            </label>
          </div>
          <div className="border-t pt-3">
            <button type="button" className="button-secondary w-full justify-center gap-2" onClick={onOpenUserGuide}>
              <InfoIcon />
              Einführung erneut öffnen
            </button>
          </div>
        </div>
      </details>
    </div>
  </header>
);
