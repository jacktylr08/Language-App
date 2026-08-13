/**
 * Two courses, one app.
 *
 * The promise made in the switcher UI is "switch any time — each course keeps
 * its own progress, streak and tutor. Nothing is lost either way." That is a
 * promise about storage keys, and breaking it would not throw: the learner
 * would simply open Spanish one day and find their streak gone, which is the
 * single worst bug this app can have.
 */
import {
  LANGUAGES,
  getActiveLanguageId,
  setActiveLanguageId,
  getAvailableLanguages,
  hasLanguageChoice,
} from '../languages';
import { progressKeyFor, tutorProfileKeyFor, PROGRESS_KEY } from '../keys';
import { loadProgress, completeLessonLocal, currentStreak } from '../progress';
import { getCurriculum, getCurriculumFor, getRegisteredCurriculumLanguages } from '../curriculum';
import { getReadings } from '../readings';
import { curriculum as italian } from '../curriculum/it';

beforeEach(() => {
  localStorage.clear();
  setActiveLanguageId('es');
});

describe('both courses are registered and startable', () => {
  it('offers Spanish and Italian', () => {
    const ids = getAvailableLanguages().map((l) => l.id);
    expect(ids).toContain('es');
    expect(ids).toContain('it');
  });

  it('has real curriculum content behind every language it offers', () => {
    // The registry is the reality check on the LANGUAGES list — a language
    // marked available with no course behind it would render an empty
    // dashboard with no explanation.
    const registered = new Set(getRegisteredCurriculumLanguages());
    for (const l of getAvailableLanguages()) {
      expect(registered.has(l.id)).toBe(true);
      expect(getCurriculumFor(l.id).length).toBeGreaterThan(0);
    }
  });

  it('now genuinely offers a choice, so the picker is worth showing', () => {
    expect(hasLanguageChoice()).toBe(true);
  });

  it('never marks a language available without a curriculum', () => {
    const registered = new Set(getRegisteredCurriculumLanguages());
    const orphans = LANGUAGES.filter((l) => l.available && !registered.has(l.id)).map((l) => l.id);
    expect(orphans).toEqual([]);
  });
});

describe('switching serves the right course', () => {
  it('returns Italian lessons once Italian is active', () => {
    setActiveLanguageId('it');
    expect(getActiveLanguageId()).toBe('it');
    expect(getCurriculum()[0].slug).toBe(italian[0].slug);
    // A sanity check that it really is Italian content, not Spanish reordered.
    expect(getCurriculum().some((l) => l.vocab.some((w) => w.es === 'ciao'))).toBe(true);
  });

  it('returns Spanish lessons again on switching back', () => {
    setActiveLanguageId('it');
    setActiveLanguageId('es');
    expect(getCurriculum().some((l) => l.vocab.some((w) => w.es === 'hola'))).toBe(true);
  });

  it('serves each course its own reading passages', () => {
    const spanish = getReadings('es').map((r) => r.slug);
    const italianReads = getReadings('it').map((r) => r.slug);
    expect(spanish.length).toBeGreaterThan(0);
    expect(italianReads.length).toBeGreaterThan(0);
    // Showing Spanish passages inside the Italian course is exactly the bug
    // that makes a language switch feel half-finished.
    expect(italianReads.some((s) => spanish.includes(s))).toBe(false);
  });
});

describe('progress is kept per course, and never lost', () => {
  it('stores each course under its own key', () => {
    expect(progressKeyFor('es')).toBe(PROGRESS_KEY);
    expect(progressKeyFor('it')).not.toBe(progressKeyFor('es'));
    expect(tutorProfileKeyFor('it')).not.toBe(tutorProfileKeyFor('es'));
  });

  it('keeps Spanish progress intact while working in Italian', () => {
    completeLessonLocal('greetings-essentials', 95);
    const spanishStreak = currentStreak(loadProgress());
    const spanishDone = Object.keys(loadProgress().lessons).length;
    expect(spanishDone).toBe(1);

    setActiveLanguageId('it');
    // A brand-new Italian course — not a view of the Spanish one.
    expect(Object.keys(loadProgress().lessons).length).toBe(0);
    completeLessonLocal('essere-identity', 80);
    expect(Object.keys(loadProgress().lessons).length).toBe(1);

    setActiveLanguageId('es');
    const back = loadProgress();
    expect(Object.keys(back.lessons).length).toBe(1);
    expect(back.lessons['greetings-essentials'].bestAccuracy).toBe(95);
    expect(currentStreak(back)).toBe(spanishStreak);
  });

  it('survives repeated switching in both directions', () => {
    completeLessonLocal('greetings-essentials', 90);
    for (let i = 0; i < 4; i++) {
      setActiveLanguageId('it');
      setActiveLanguageId('es');
    }
    expect(loadProgress().lessons['greetings-essentials'].bestAccuracy).toBe(90);
  });

  it('does not blend the two courses even when a slug appears in both', () => {
    // Both courses have a lesson called greetings-essentials. Sharing a
    // storage key would make finishing one silently complete the other.
    completeLessonLocal('greetings-essentials', 100);
    setActiveLanguageId('it');
    expect(loadProgress().lessons['greetings-essentials']).toBeUndefined();
  });
});
