import { describe, expect, it } from "vitest";
import { visualThemeOptions } from "./AppHeader";

describe("AppHeader", () => {
  it("keeps the locally supported visual themes uniquely selectable", () => {
    const values = visualThemeOptions.map((option) => option.value);

    expect(values).toHaveLength(12);
    expect(new Set(values)).toHaveLength(values.length);
    expect(values).toContain("barrierefrei");
  });

  it("lists visual themes alphabetically by their visible names", () => {
    const labels = visualThemeOptions.map((option) => option.label);
    const sortedLabels = [...labels].sort((left, right) => left.localeCompare(right, "de-DE", { numeric: true }));

    expect(labels).toEqual(sortedLabels);
  });
});
