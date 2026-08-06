import { describe, expect, it } from "vitest";
import { visualThemeOptions } from "./AppHeader";

describe("AppHeader", () => {
  it("keeps the locally supported visual themes uniquely selectable", () => {
    const values = visualThemeOptions.map((option) => option.value);

    expect(values).toHaveLength(9);
    expect(new Set(values)).toHaveLength(values.length);
    expect(values).toContain("barrierefrei");
  });
});
