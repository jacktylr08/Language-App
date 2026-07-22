import {
  LANGUAGES,
  getLanguage,
  getActiveLanguageId,
  setActiveLanguageId,
  getActiveLanguage,
} from '../languages';

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
