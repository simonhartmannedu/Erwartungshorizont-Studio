import { describe, expect, it } from "vitest";
import { communityLicenseLabel } from "./AppFooter";

describe("AppFooter", () => {
  it("shows the AGPL-3.0 notice in the community application", () => {
    expect(communityLicenseLabel).toBe("GNU Affero General Public License v3.0 (AGPL-3.0)");
  });
});
