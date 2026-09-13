import { scopedStorageKey } from "./storageScope";
import type { VisualTheme } from "../types";

export type UserPreferences = {
  showSelectionReminder: boolean;
  favoriteVisualThemes: VisualTheme[];
  easyMode: boolean;
};

const visualThemeValues: VisualTheme[] = [
  "pdf-report", "earth-paper", "nrw-trikolore", "waldmeister-schorle", "blaubeer-pommesbude", "flieder-feierabend",
  "beamtensalon", "barrierefrei", "video-tutorial", "kreidestaub-kaffein", "overheadprojektor-3000", "kopierer-0758",
];

const USER_PREFERENCES_KEY = scopedStorageKey("user-preferences");

export const defaultUserPreferences: UserPreferences = {
  showSelectionReminder: true,
  favoriteVisualThemes: [],
  easyMode: false,
};

export const loadUserPreferences = (): UserPreferences => {
  try {
    const raw = window.localStorage.getItem(USER_PREFERENCES_KEY);
    if (!raw) return defaultUserPreferences;

    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return {
      showSelectionReminder:
        typeof parsed.showSelectionReminder === "boolean"
          ? parsed.showSelectionReminder
          : defaultUserPreferences.showSelectionReminder,
      favoriteVisualThemes: Array.isArray(parsed.favoriteVisualThemes)
        ? [...new Set(parsed.favoriteVisualThemes.filter((theme): theme is VisualTheme => visualThemeValues.includes(theme as VisualTheme)))]
        : defaultUserPreferences.favoriteVisualThemes,
      easyMode: typeof parsed.easyMode === "boolean" ? parsed.easyMode : defaultUserPreferences.easyMode,
    };
  } catch {
    return defaultUserPreferences;
  }
};

export const saveUserPreferences = (preferences: UserPreferences) => {
  try {
    window.localStorage.setItem(USER_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // Preferences are optional and must never block normal work.
  }
};
