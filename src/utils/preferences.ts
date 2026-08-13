import { scopedStorageKey } from "./storageScope";

export type UserPreferences = {
  showSelectionReminder: boolean;
};

const USER_PREFERENCES_KEY = scopedStorageKey("user-preferences");

export const defaultUserPreferences: UserPreferences = {
  showSelectionReminder: true,
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
