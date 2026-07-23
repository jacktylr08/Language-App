/**
 * The course language registry. Fluenta is built to grow into more languages
 * over time — everything that's specific to "which language" (flag, display
 * name, native name, and which curriculum/progress/tutor-memory data belongs
 * to it) reads from here, so adding a second course later means registering
 * it below, not hunting down hardcoded "Spanish"/🇪🇸 strings across the app.
 *
 * Only Spanish is registered today. Adding a real second language is a
 * separate, much bigger task (authoring its curriculum) — this module is
 * just the architecture: an account's active language is a real, persisted
 * choice, and every other module (curriculum, progress, tutor-memory,
 * tutor-context) reads it from here rather than assuming Spanish.
 */
import { ACTIVE_LANGUAGE_KEY } from './keys';

export interface CourseLanguage {
  id: string;
  /** English name, e.g. "Spanish". */
  name: string;
  /** The language's own name for itself, e.g. "Español". */
  nativeName: string;
  /** BCP-47 locale tag for speech APIs (Web Speech recognition/synthesis, TTS) — e.g. "es-ES". */
  locale: string;
  flag: string;
  /**
   * The flag's horizontal colour bands, top to bottom, weights summing to 1 —
   * drives the ambient waving-flag background (see LanguageFlagBanner). Only
   * fits horizontally-banded flags; a future language with a different flag
   * layout (vertical stripes, an emblem, etc.) would need that component
   * adapted, not just this config extended.
   */
  flagBands: Array<{ color: string; weight: number }>;
}

export const LANGUAGES: CourseLanguage[] = [
  {
    id: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    locale: 'es-ES',
    flag: '🇪🇸',
    flagBands: [
      { color: '#AA151B', weight: 0.25 },
      { color: '#F1BF00', weight: 0.5 },
      { color: '#AA151B', weight: 0.25 },
    ],
  },
];

const DEFAULT_LANGUAGE_ID = 'es';

export function getLanguage(id: string): CourseLanguage {
  return LANGUAGES.find((l) => l.id === id) ?? LANGUAGES[0];
}

/** The account's active course language id — persisted, defaults to Spanish. */
export function getActiveLanguageId(): string {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE_ID;
  try {
    const stored = localStorage.getItem(ACTIVE_LANGUAGE_KEY);
    return stored && LANGUAGES.some((l) => l.id === stored) ? stored : DEFAULT_LANGUAGE_ID;
  } catch {
    return DEFAULT_LANGUAGE_ID;
  }
}

/** Fired whenever the active language changes, so mounted components can
 * refresh without requiring a full reload (see CourseChip/LanguageFlagBanner). */
export const LANGUAGE_CHANGE_EVENT = 'fluenta-language-change';

export function setActiveLanguageId(id: string): void {
  if (typeof window === 'undefined' || !LANGUAGES.some((l) => l.id === id)) return;
  try {
    localStorage.setItem(ACTIVE_LANGUAGE_KEY, id);
    window.dispatchEvent(new CustomEvent(LANGUAGE_CHANGE_EVENT));
  } catch {
    /* ignore */
  }
}

export function getActiveLanguage(): CourseLanguage {
  return getLanguage(getActiveLanguageId());
}
