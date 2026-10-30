import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CITY_BACKGROUNDS, backgroundCredit, backgroundSrcSet, pickBackground } from "@/content/cityBackgrounds";

describe("city backgrounds", () => {
  it("ships Paris with files on disk and a real Commons credit", () => {
    expect(CITY_BACKGROUNDS.map((b) => b.key)).toContain("paris");
    for (const bg of CITY_BACKGROUNDS) {
      expect(bg.alt.length).toBeGreaterThan(10);
      for (const v of bg.variants) expect(existsSync(join(process.cwd(), "public", v.src))).toBe(true);
      const c = backgroundCredit(bg);
      expect(c).not.toBeNull();
      expect(c!.sourceUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(c!.author).toBeTruthy();
      expect(c!.author).not.toBe("Unknown");
      expect(c!.license).toBeTruthy();
      expect(existsSync(join(process.cwd(), "public", c!.src))).toBe(true);
    }
  });
  it("builds a srcset and picks cyclically", () => {
    expect(backgroundSrcSet(CITY_BACKGROUNDS[0])).toContain("paris-960.jpg 960w");
    expect(pickBackground(0)?.key).toBe("paris");
    expect(pickBackground(5)?.key).toBe("paris");
    expect(pickBackground(0, [])).toBeNull();
  });
});
