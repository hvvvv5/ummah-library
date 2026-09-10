import type { Locale } from "./config";

/**
 * UI locale controls the presentation of translations, not their selection or
 * persisted data. Arabic UI is intentionally Arabic-first: Quran text and
 * tafsir remain available, while English translation chrome and text are hidden.
 */
export function showQuranTranslations(locale: Locale): boolean {
  return locale === "en";
}

/** A saved translation-reading mode must not expose translations in Arabic UI. */
export function visibleReadingMode<T extends "translation" | "reading" | "reading-tr">(
  locale: Locale,
  mode: T,
): T | "reading" {
  return locale === "ar" && mode === "reading-tr" ? "reading" : mode;
}

/** Tafsir is independent of UI locale and always remains available. */
export function showTafsir(_locale: Locale): true {
  return true;
}
