/**
 * The course language this build is teaching. Fluenta is built to grow into
 * more languages over time — everything that's specific to "which language"
 * (flag, display name, native name) reads from here, so adding a second
 * course later is a matter of extending this, not hunting down hardcoded
 * "Spanish"/🇪🇸 strings across the app.
 */
export interface CourseLanguage {
  id: string;
  /** English name, e.g. "Spanish". */
  name: string;
  /** The language's own name for itself, e.g. "Español". */
  nativeName: string;
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

export const CURRENT_LANGUAGE: CourseLanguage = {
  id: 'es',
  name: 'Spanish',
  nativeName: 'Español',
  flag: '🇪🇸',
  flagBands: [
    { color: '#AA151B', weight: 0.25 },
    { color: '#F1BF00', weight: 0.5 },
    { color: '#AA151B', weight: 0.25 },
  ],
};
