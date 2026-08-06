import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StorageLoadingScreen, StorageUnavailableScreen } from "./AppStartupScreens";

describe("AppStartupScreens", () => {
  it("announces local storage initialization to assistive technology", () => {
    const markup = renderToStaticMarkup(createElement(StorageLoadingScreen));

    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain("Lokaler Speicher wird vorbereitet");
  });

  it("shows a safe recovery action for a storage error", () => {
    const markup = renderToStaticMarkup(
      createElement(StorageUnavailableScreen, {
        detail: "Der lokale Speicher konnte nicht geöffnet werden.",
        onReload: () => undefined,
      }),
    );

    expect(markup).toContain("Lokaler Speicher nicht verfügbar");
    expect(markup).toContain("Seite neu laden");
  });
});
