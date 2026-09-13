import { useMemo, useState } from "react";
import { ChevronDownIcon, FullscreenExitIcon, FullscreenIcon, InfoIcon, MoonIcon, PaletteIcon, SettingsIcon, StarIcon, SunIcon } from "../components/icons";
import type { ThemeMode, VisualTheme } from "../types";

export const visualThemeOptions: { value: VisualTheme; label: string }[] = [
  { value: "earth-paper", label: "Bernsteinzimmer im Lehrerzimmer" },
  { value: "blaubeer-pommesbude", label: "Blaubeer-Pommesbude" },
  { value: "beamtensalon", label: "DIN A4, aber glamourös" },
  { value: "video-tutorial", label: "Erklärvideo bei 1,25×" },
  { value: "flieder-feierabend", label: "Flieder nach Dienstschluss" },
  { value: "barrierefrei", label: "Kontrast auf Anschlag (barrierefrei)" },
  { value: "kopierer-0758", label: "Kopierer, 07:58 Uhr" },
  { value: "kreidestaub-kaffein", label: "Kreidestaub & Koffein" },
  { value: "nrw-trikolore", label: "Landesdienst in Farbe" },
  { value: "overheadprojektor-3000", label: "Overheadprojektor 3000" },
  { value: "pdf-report", label: "PDF, aber schick" },
  { value: "waldmeister-schorle", label: "Waldmeister-Schorle" },
];

export type GlobalSearchResult = {
  id: string;
  kind: "student" | "workspace";
  label: string;
  detail: string;
};

const ThemePicker = ({
  visualTheme,
  favoriteVisualThemes,
  onVisualThemeChange,
  onFavoriteVisualThemesChange,
}: Pick<AppHeaderProps, "visualTheme" | "favoriteVisualThemes" | "onVisualThemeChange" | "onFavoriteVisualThemesChange">) => {
  const [open, setOpen] = useState(false);
  const favoriteSet = useMemo(() => new Set(favoriteVisualThemes), [favoriteVisualThemes]);
  const options = useMemo(
    () =>
      [...visualThemeOptions].sort((left, right) => {
        const favoriteOrder = Number(favoriteSet.has(right.value)) - Number(favoriteSet.has(left.value));
        return favoriteOrder || left.label.localeCompare(right.label, "de-DE", { numeric: true });
      }),
    [favoriteSet],
  );
  const activeLabel = visualThemeOptions.find((option) => option.value === visualTheme)?.label ?? "Darstellung wählen";

  const toggleFavorite = (theme: VisualTheme) => {
    onFavoriteVisualThemesChange(
      favoriteSet.has(theme)
        ? favoriteVisualThemes.filter((value) => value !== theme)
        : [...favoriteVisualThemes, theme],
    );
  };

  return (
    <div className="theme-picker block w-full min-w-0 sm:min-w-[220px] sm:w-auto">
      <span className="label inline-flex items-center gap-2"><PaletteIcon className="h-3.5 w-3.5" />Darstellung</span>
      <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
        <summary className="field header-control" aria-label={`Darstellung: ${activeLabel}`}>
          <span>{activeLabel}</span>
          <ChevronDownIcon className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </summary>
        <div className="theme-picker-menu" role="listbox" aria-label="Darstellung auswählen">
          <p className="theme-picker-hint">Stern markieren, um Themes oben anzuheften.</p>
          {options.map((option) => {
            const isFavorite = favoriteSet.has(option.value);
            return (
              <div key={option.value} className={`theme-picker-option ${option.value === visualTheme ? "theme-picker-option-active" : ""}`}>
                <button
                  type="button"
                  className="theme-picker-select"
                  role="option"
                  aria-selected={option.value === visualTheme}
                  onClick={() => {
                    onVisualThemeChange(option.value);
                    setOpen(false);
                  }}
                >
                  {option.label}
                </button>
                <button
                  type="button"
                  className={`theme-picker-favorite ${isFavorite ? "theme-picker-favorite-active" : ""}`}
                  aria-pressed={isFavorite}
                  aria-label={`${option.label} ${isFavorite ? "nicht mehr" : "als"} favorisieren`}
                  title={isFavorite ? "Favorit entfernen" : "Als Favorit markieren"}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    toggleFavorite(option.value);
                  }}
                >
                  <StarIcon filled={isFavorite} />
                </button>
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
};

type AppHeaderProps = {
  visualTheme: VisualTheme;
  onVisualThemeChange: (theme: VisualTheme) => void;
  favoriteVisualThemes: VisualTheme[];
  onFavoriteVisualThemesChange: (themes: VisualTheme[]) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  isAppFullscreen: boolean;
  isFullscreenAvailable: boolean;
  onToggleAppFullscreen: () => void;
  onOpenUserGuide: () => void;
  showSelectionReminder: boolean;
  onShowSelectionReminderChange: (enabled: boolean) => void;
  easyMode: boolean;
  onEasyModeChange: (enabled: boolean) => void;
};

/** Presentational application header; state and persistence remain in App. */
export const AppHeader = ({
  visualTheme,
  onVisualThemeChange,
  favoriteVisualThemes,
  onFavoriteVisualThemesChange,
  theme,
  onToggleTheme,
  isAppFullscreen,
  isFullscreenAvailable,
  onToggleAppFullscreen,
  onOpenUserGuide,
  showSelectionReminder,
  onShowSelectionReminderChange,
  easyMode,
  onEasyModeChange,
}: AppHeaderProps) => (
  <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
    <div className="max-w-4xl">
      <p className="hero-kicker mb-3">Erwartungshorizont-Studio | NRW Edition</p>
      <div className="brand-header-lockup">
        <div className="min-w-0">
          <h1 className="font-display themed-strong text-4xl md:text-5xl">Erwartungshorizont Studio</h1>
          <p className="themed-muted mt-4 max-w-3xl text-base leading-7">
            Erwartungshorizonte, erstellen und verwalten
          </p>
        </div>
      </div>
    </div>
    <div className="header-actions flex w-full flex-col gap-3 no-print sm:flex-row sm:flex-wrap sm:items-end sm:justify-end lg:w-auto lg:justify-self-end">
      <ThemePicker
        visualTheme={visualTheme}
        favoriteVisualThemes={favoriteVisualThemes}
        onVisualThemeChange={onVisualThemeChange}
        onFavoriteVisualThemesChange={onFavoriteVisualThemesChange}
      />
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
            <p className="label">Arbeitsweise</p>
            <label className="mt-2 flex cursor-pointer items-start gap-3 text-sm leading-5">
              <input
                type="checkbox"
                className="mt-1"
                checked={easyMode}
                onChange={(event) => onEasyModeChange(event.target.checked)}
              />
              <span>
                <strong className="themed-strong block">Easy Mode</strong>
                <span className="themed-muted">Zeigt nur EWH-Erstellung, Bearbeitung und Export. Lerngruppen, Archiv, Backup und weitere Menüs bleiben ausgeblendet.</span>
              </span>
            </label>
          </div>
          {!easyMode ? (
            <>
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
                    <strong className="themed-strong block">Tooltips anzeigen</strong>
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
            </>
          ) : null}
        </div>
      </details>
    </div>
  </header>
);
