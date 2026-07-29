import {
  LANGUAGES,
  getLanguage,
  getActiveLanguageId,
  setActiveLanguageId,
  getActiveLanguage,
  getAvailableLanguages,
} from '../languages';
import { ACTIVE_LANGUAGE_KEY } from '../keys';

describe('language registry', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to Spanish when nothing has been chosen', () => {
    expect(getActiveLanguageId()).toBe('es');
    expect(getActiveLanguage().id).toBe('es');
  });

  it('getLanguage falls back to the first registered language for an unknown id', () => {
    expect(getLanguage('not-a-real-language').id).toBe(LANGUAGES[0].id);
  });

  it('persists a valid choice and reflects it on next read', () => {
    setActiveLanguageId('es');
    expect(getActiveLanguageId()).toBe('es');
  });

  it('refuses to persist a language id that was never registered', () => {
    setActiveLanguageId('klingon');
    // Falls back to the default rather than trusting an unregistered value.
    expect(getActiveLanguageId()).toBe('es');
  });

  it('ignores a corrupted/unregistered stored value rather than trusting it', () => {
    localStorage.setItem('aprende-active-language', 'not-a-real-language');
    expect(getActiveLanguageId()).toBe('es');
  });
});

describe('a language without a course can never become active', () => {
  /**
   * The registry now declares the languages Fluenta intends to teach, not just
   * the one it has. If a declared-but-unbuilt language could become active, a
   * learner would land on an empty course with no lessons and no explanation —
   * so availability is enforced on both write and read, not trusted.
   */
  beforeEach(() => localStorage.clear());

  it('refuses to set an unavailable language', () => {
    const unavailable = LANGUAGES.find((l) => !l.available);
    expect(unavailable).toBeDefined();
    setActiveLanguageId(unavailable!.id);
    expect(getActiveLanguageId()).toBe('es');
  });

  it('ignores an unavailable language already sitting in storage', () => {
    // e.g. written by an older build, or by hand.
    localStorage.setItem(ACTIVE_LANGUAGE_KEY, 'fr');
    expect(getActiveLanguageId()).toBe('es');
  });

  it('accepts a language that is genuinely available', () => {
    setActiveLanguageId('es');
    expect(getActiveLanguageId()).toBe('es');
  });

  it('only reports available languages as startable', () => {
    expect(getAvailableLanguages().every((l) => l.available)).toBe(true);
    expect(getAvailableLanguages().length).toBeGreaterThan(0);
  });

  it('declares more languages than it has built, so the app reads as a language app', () => {
    expect(LANGUAGES.length).toBeGreaterThan(getAvailableLanguages().length);
  });

  it('gives every declared language the fields the picker renders', () => {
    for (const l of LANGUAGES) {
      expect(l.name).toBeTruthy();
      expect(l.nativeName).toBeTruthy();
      expect(l.greeting).toBeTruthy();
      expect(l.flag).toBeTruthy();
      expect(l.locale).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
      expect(l.flagBands.length).toBeGreaterThan(0);
    }
  });
});
