import { FullscreenExitIcon, FullscreenIcon, InfoIcon, MoonIcon, PaletteIcon, SaveIcon, SunIcon } from "../components/icons";
import type { ThemeMode, VisualTheme } from "../types";
import { formatBackupRecency, type BackupStatus } from "../utils/backup";

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
  backupStatus: BackupStatus;
  lastBackupAt: string | null;
  onOpenBackup: () => void;
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
  backupStatus,
  lastBackupAt,
  onOpenBackup,
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
    <div className="header-actions flex w-full flex-col gap-3 no-print sm:flex-row sm:flex-wrap sm:items-end sm:justify-end lg:w-auto">
      <div className="header-display-group w-full sm:min-w-[210px] sm:w-auto">
        <label className="block min-w-0 flex-1">
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
        <button
          type="button"
          className={`backup-status-indicator backup-status-indicator-${backupStatus.tone}`}
          onClick={onOpenBackup}
          title={`Datensicherung: ${backupStatus.summary}. Letzte Sicherung: ${formatBackupRecency(lastBackupAt)}. ${backupStatus.detail}`}
          aria-label={`Datensicherung öffnen. ${backupStatus.summary}`}
        >
          <SaveIcon />
          <span className="sr-only">{backupStatus.summary}</span>
        </button>
      </div>
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
      <button
        type="button"
        className="button-secondary header-control w-full gap-2 sm:w-auto"
        onClick={onOpenUserGuide}
        title="Kurze Einführung öffnen"
      >
        <InfoIcon />
        Hilfe
      </button>
    </div>
  </header>
);
