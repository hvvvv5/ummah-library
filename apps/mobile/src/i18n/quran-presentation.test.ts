import { describe, expect, it } from "vitest";
import { showQuranTranslations, showTafsir, visibleReadingMode } from "./quran-presentation";

describe("Quran translation presentation by UI locale", () => {
  it("hides translations in Arabic without changing the saved preference", () => {
    expect(showQuranTranslations("ar")).toBe(false);
    expect(visibleReadingMode("ar", "reading-tr")).toBe("reading");
  });

  it("shows translations and preserves the reading mode in English", () => {
    expect(showQuranTranslations("en")).toBe(true);
    expect(visibleReadingMode("en", "reading-tr")).toBe("reading-tr");
  });

  it("keeps tafsir available in both UI languages", () => {
    expect(showTafsir("ar")).toBe(true);
    expect(showTafsir("en")).toBe(true);
  });
});
