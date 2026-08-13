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
   * Whether a real course exists. Everything except Spanish is declared but
   * not yet authored: the app is deliberately built as a language app with one
   * language finished, rather than a Spanish app that a second language has to
   * be retrofitted into. Listing them is also honest with a new learner about
   * what they can actually start today.
   */
  available: boolean;
  /**
   * A first phrase, shown on the picker. Nothing teaches "this is a real
   * course" faster than seeing the language itself.
   */
  greeting: string;
  /**
   * The flag's horizontal colour bands, top to bottom, weights summing to 1 —
   * drives the ambient waving-flag background (see LanguageFlagBanner). Only
   * fits horizontally-banded flags; a language with a different flag layout
   * (vertical stripes, an emblem, a cross) needs that component adapted, not
   * just this config extended — hence the fallback bands below for the ones
   * that don't fit the model.
   */
  flagBands: Array<{ color: string; weight: number }>;
}

/**
 * The languages Fluenta intends to teach.
 *
 * Ordered by how many people are likely to want them, not alphabetically.
 * `available` gates whether a course can actually be started — see
 * getRegisteredCurriculumLanguages() in curriculum/index.ts, which is the
 * source of truth for what content genuinely exists. This list is the
 * ambition; that one is the reality, and the picker cross-checks both so a
 * language can never be offered without a curriculum behind it.
 */
export const LANGUAGES: CourseLanguage[] = [
  {
    id: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    locale: 'es-ES',
    flag: '🇪🇸',
    available: true,
    greeting: '¡Hola!',
    flagBands: [
      { color: '#AA151B', weight: 0.25 },
      { color: '#F1BF00', weight: 0.5 },
      { color: '#AA151B', weight: 0.25 },
    ],
  },
  {
    id: 'fr',
    name: 'French',
    nativeName: 'Français',
    locale: 'fr-FR',
    flag: '🇫🇷',
    available: false,
    greeting: 'Bonjour !',
    // Vertical tricolour — approximated as bands until the banner handles
    // vertical stripes.
    flagBands: [
      { color: '#002395', weight: 0.34 },
      { color: '#FFFFFF', weight: 0.33 },
      { color: '#ED2939', weight: 0.33 },
    ],
  },
  {
    id: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    locale: 'de-DE',
    flag: '🇩🇪',
    available: false,
    greeting: 'Hallo!',
    flagBands: [
      { color: '#000000', weight: 0.34 },
      { color: '#DD0000', weight: 0.33 },
      { color: '#FFCE00', weight: 0.33 },
    ],
  },
  {
    id: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    locale: 'it-IT',
    flag: '🇮🇹',
    available: true,
    greeting: 'Ciao!',
    flagBands: [
      { color: '#008C45', weight: 0.34 },
      { color: '#F4F5F0', weight: 0.33 },
      { color: '#CD212A', weight: 0.33 },
    ],
  },
  {
    id: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    locale: 'pt-PT',
    flag: '🇵🇹',
    available: false,
    greeting: 'Olá!',
    flagBands: [
      { color: '#046A38', weight: 0.4 },
      { color: '#DA291C', weight: 0.6 },
    ],
  },
  {
    id: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    locale: 'ja-JP',
    flag: '🇯🇵',
    available: false,
    greeting: 'こんにちは',
    flagBands: [
      { color: '#FFFFFF', weight: 0.5 },
      { color: '#BC002D', weight: 0.5 },
    ],
  },
];

/** Languages a learner can actually start a course in today. */
export function getAvailableLanguages(): CourseLanguage[] {
  return LANGUAGES.filter((l) => l.available);
}

/**
 * Whether asking "which language?" is a real question yet.
 *
 * A menu with one item is not a choice, it's a step. While exactly one course
 * is finished, the welcome flow skips the picker and opens on that language —
 * and the moment a second course is marked available, the picker returns on
 * its own with no code change. The registry stays the source of truth either
 * way; this only decides whether the learner is asked.
 */
export function hasLanguageChoice(): boolean {
  return getAvailableLanguages().length > 1;
}

const DEFAULT_LANGUAGE_ID = 'es';

export function getLanguage(id: string): CourseLanguage {
  return LANGUAGES.find((l) => l.id === id) ?? LANGUAGES[0];
}

/**
 * The account's active course language id — persisted, defaults to Spanish.
 *
 * Only ever returns a language with `available: true`. A declared-but-unbuilt
 * language reaching this would leave a learner staring at an empty course with
 * no lessons and no explanation, so the stored value is validated against
 * availability on every read rather than trusted.
 */
export function getActiveLanguageId(): string {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE_ID;
  try {
    const stored = localStorage.getItem(ACTIVE_LANGUAGE_KEY);
    const usable = stored && LANGUAGES.some((l) => l.id === stored && l.available);
    return usable ? stored : DEFAULT_LANGUAGE_ID;
  } catch {
    return DEFAULT_LANGUAGE_ID;
  }
}

/** Fired whenever the active language changes, so mounted components can
 * refresh without requiring a full reload (see CourseChip/LanguageFlagBanner). */
export const LANGUAGE_CHANGE_EVENT = 'fluenta-language-change';

export function setActiveLanguageId(id: string): void {
  // Availability, not just existence — see getActiveLanguageId.
  if (typeof window === 'undefined' || !LANGUAGES.some((l) => l.id === id && l.available)) return;
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
