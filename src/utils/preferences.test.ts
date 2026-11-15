import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultUserPreferences, loadUserPreferences, saveUserPreferences } from "./preferences";

afterEach(() => vi.unstubAllGlobals());

describe("Ko-fi-Präferenz", () => {
  it("liest ältere Einstellungen weiter und erhält das bisher aktive Verhalten", () => {
    vi.stubGlobal("window", { localStorage: { getItem: () => JSON.stringify({ easyMode: true, showSelectionReminder: false, favoriteVisualThemes: ["earth-paper"] }) } });
    expect(loadUserPreferences()).toMatchObject({ easyMode: true, showSelectionReminder: false, showSupportPrompts: true, favoriteVisualThemes: ["earth-paper"] });
  });
  it("speichert und lädt ausdrücklich deaktivierte Hinweise ohne andere Einstellungen zu verlieren", () => {
    let raw = "";
    vi.stubGlobal("window", { localStorage: { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value; } } });
    const preferences = { ...defaultUserPreferences, easyMode: true, showSupportPrompts: false };
    saveUserPreferences(preferences);
    expect(loadUserPreferences()).toEqual(preferences);
  });
  it("verwendet für ungültige Präferenzen und nicht verfügbaren Speicher sichere Standardwerte", () => {
    vi.stubGlobal("window", { localStorage: { getItem: () => '{"showSupportPrompts":"false"}' } });
    expect(loadUserPreferences().showSupportPrompts).toBe(true);
    vi.stubGlobal("window", { localStorage: { getItem: () => "broken", setItem: () => { throw new Error("unavailable"); } } });
    expect(loadUserPreferences()).toEqual(defaultUserPreferences);
    expect(() => saveUserPreferences(defaultUserPreferences)).not.toThrow();
  });
});
