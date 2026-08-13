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
import {
  loadProgress,
  completeLessonLocal,
  currentStreak,
  localDay,
  type ProgressState,
} from '../progress';
import {
  buildSyncPayloadForTest,
  applySyncPayloadForTest,
  syncPayloadHasContentForTest,
} from '../sync';
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

describe('syncing keeps the courses apart', () => {
  /**
   * The bug this exists for, reported with screenshots: switching to Italian
   * showed Italian lesson titles carrying SPANISH stars, streak and word
   * counts. Local storage was correctly per-language — but the server holds
   * ONE flat blob per account, and applyBlob wrote it to whichever course
   * happened to be active. So the first sync after switching copied the
   * learner's Spanish progress into the Italian key, and the next push sent
   * the blend back up.
   *
   * mergeBlob/applyBlob aren't exported, so these drive the observable
   * contract instead: what localBlob puts on the wire, and what a pulled blob
   * does to local storage.
   */
  it('puts every course on the wire, not just the active one', () => {
    completeLessonLocal('greetings-essentials', 95);
    setActiveLanguageId('it');
    completeLessonLocal('essere-identity', 80);

    const blob = buildSyncPayloadForTest();
    // Spanish stays where every existing account's row already has it.
    expect(Object.keys(blob.progress?.lessons ?? {})).toContain('greetings-essentials');
    // Italian is namespaced, not overwriting it.
    expect(Object.keys(blob.languages?.it?.progress?.lessons ?? {})).toContain('essere-identity');
    expect(Object.keys(blob.languages?.it?.progress?.lessons ?? {})).not.toContain(
      'greetings-essentials'
    );
  });

  it('a pulled blob lands in the right course, whichever one is on screen', () => {
    // Exactly the reported failure: pull the account's Spanish row while
    // Italian is the active course.
    setActiveLanguageId('it');
    applySyncPayloadForTest({
      progress: {
        streak: 9,
        bestStreak: 9,
        lastActiveDay: '2026-01-01',
        activeDays: ['2026-01-01'],
        lessons: { 'greetings-essentials': { completed: true, bestAccuracy: 100, timesCompleted: 1 } },
        words: {},
      } as ProgressState,
    });

    // Italian must still be untouched...
    expect(loadProgress().lessons['greetings-essentials']).toBeUndefined();
    expect(currentStreak(loadProgress())).toBe(0);

    // ...and Spanish must have received it.
    setActiveLanguageId('es');
    expect(loadProgress().lessons['greetings-essentials']?.bestAccuracy).toBe(100);
  });

  it('restores each course to its own key from a namespaced blob', () => {
    setActiveLanguageId('es');
    applySyncPayloadForTest({
      progress: {
        streak: 3,
        bestStreak: 3,
        // Today, because currentStreak correctly lapses a stale one — a fixed
        // past date would be testing the calendar, not the sync split.
        lastActiveDay: localDay(),
        activeDays: [localDay()],
        lessons: { 'greetings-essentials': { completed: true, bestAccuracy: 90, timesCompleted: 1 } },
        words: {},
      } as ProgressState,
      languages: {
        it: {
          progress: {
            streak: 7,
            bestStreak: 7,
            lastActiveDay: localDay(),
            activeDays: [localDay()],
            lessons: { 'essere-identity': { completed: true, bestAccuracy: 70, timesCompleted: 1 } },
            words: {},
          } as ProgressState,
        },
      },
    });

    expect(loadProgress().lessons['greetings-essentials']?.bestAccuracy).toBe(90);
    expect(currentStreak(loadProgress())).toBe(3);

    setActiveLanguageId('it');
    expect(loadProgress().lessons['essere-identity']?.bestAccuracy).toBe(70);
    expect(loadProgress().lessons['greetings-essentials']).toBeUndefined();
    expect(currentStreak(loadProgress())).toBe(7);
  });

  it('counts an Italian-only learner as having something worth pushing', () => {
    // hasAnythingToSave checked only the top-level (Spanish) progress, so a
    // learner who had studied nothing but Italian looked like an empty device
    // and the "never let an empty device overwrite a full account" guard
    // silently refused to ever push their work.
    setActiveLanguageId('it');
    completeLessonLocal('greetings-essentials', 88);
    expect(syncPayloadHasContentForTest()).toBe(true);
  });
});
