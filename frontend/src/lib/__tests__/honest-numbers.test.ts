/**
 * Regressions for numbers the app was quietly overstating.
 *
 * Each of these was a figure the UI showed a learner that the data didn't
 * support — the kind of bug no test catches by accident, because the code
 * runs fine and just says something untrue.
 */
import { getStartingLesson } from '../course-progress';
import { seenWordCount, knownWordCount, type ProgressState } from '../progress';
import { REVIEW_SESSION_SIZE, buildReviewSession } from '../exercise-engine';
import { getCurriculum } from '../curriculum';
import { hasLanguageChoice, LANGUAGES } from '../languages';

/** A completed-lesson record, matching the real shape. */
function doneRecord(): ProgressState['lessons'][string] {
  return { completed: true, bestAccuracy: 90, timesCompleted: 1 };
}

function progressWith(lessons: ProgressState['lessons'] = {}): ProgressState {
  return {
    streak: 0,
    bestStreak: 0,
    lastActiveDay: '',
    activeDays: [],
    lessons,
    words: {},
  } as ProgressState;
}

describe('the starting lesson is resolved, not hard-coded', () => {
  const curriculum = [{ slug: 'first' }, { slug: 'second' }, { slug: 'third' }];

  it('sends a brand-new learner to the first lesson in the course', () => {
    expect(getStartingLesson(curriculum, progressWith())?.slug).toBe('first');
  });

  it('follows the course when the first lesson is renamed or reordered', () => {
    // The whole point: no component may assume a particular slug exists.
    const renamed = [{ slug: 'hello-there' }, { slug: 'second' }];
    expect(getStartingLesson(renamed, progressWith())?.slug).toBe('hello-there');
  });

  it('sends a returning learner to where they actually are', () => {
    const done = progressWith({ first: doneRecord() });
    expect(getStartingLesson(curriculum, done)?.slug).toBe('second');
  });

  it('never returns a dead target once the course is finished', () => {
    const allDone = progressWith(
      Object.fromEntries(curriculum.map((l) => [l.slug, doneRecord()]))
    );
    // Not null — the button has to go somewhere real.
    expect(getStartingLesson(curriculum, allDone)).not.toBeNull();
  });

  it('returns null only when there is genuinely no course', () => {
    expect(getStartingLesson([], progressWith())).toBeNull();
  });

  it('resolves against the real curriculum', () => {
    const first = getStartingLesson(getCurriculum(), progressWith());
    expect(first).not.toBeNull();
    expect(getCurriculum().some((l) => l.slug === first!.slug)).toBe(true);
  });
});

describe('a review session covers what the dashboard promises', () => {
  it('never builds a session larger than the advertised size', () => {
    // The dashboard quotes a duration derived from REVIEW_SESSION_SIZE. If
    // the session could exceed it, that quote becomes a lie in the other
    // direction.
    const queue = buildReviewSession(null, false);
    const distinctWords = new Set(queue.map((e) => e.word.id));
    // Guard against the assertion below passing because nothing was built.
    expect(distinctWords.size).toBeGreaterThan(0);
    expect(distinctWords.size).toBeLessThanOrEqual(REVIEW_SESSION_SIZE);
  });

  it('exposes the cap so the dashboard cannot invent its own', () => {
    expect(REVIEW_SESSION_SIZE).toBeGreaterThan(0);
  });
});

describe('word counts', () => {
  const state = progressWith();
  state.words = {
    // Met once, got it wrong — learned nothing yet.
    a: { strength: 0, correct: 0, wrong: 1, lastSeen: 0 },
    // Two correct answers, which is all "learned" claims.
    b: { strength: 2, correct: 2, wrong: 0, lastSeen: 0 },
    c: { strength: 4, correct: 4, wrong: 0, lastSeen: 0 },
  } as unknown as ProgressState['words'];

  it('counts every word met, including ones never got right', () => {
    expect(seenWordCount(state)).toBe(3);
  });

  it('counts fewer as learned than as met', () => {
    // The pairing is the point: the headline number now has a denominator, so
    // "learned" can't be read as "knows every word in the app".
    expect(knownWordCount(state)).toBe(2);
    expect(knownWordCount(state)).toBeLessThan(seenWordCount(state));
  });
});

describe('the language picker is availability-driven', () => {
  /**
   * Written when Spanish was the only course, to pin that the picker was
   * SKIPPED rather than deleted and would return by itself once a second
   * course existed. Italian has now shipped and it did exactly that — so the
   * first assertion has been inverted to match reality rather than deleted,
   * and the mechanism is still pinned from the other direction below.
   */
  it('is asked now that there is a genuine choice', () => {
    expect(hasLanguageChoice()).toBe(true);
  });

  it('is driven purely by availability, so it disappears again if a course is pulled', () => {
    // The same one-line switch that brought the picker back has to be able to
    // take it away — otherwise a course withdrawn for repairs leaves a menu
    // pointing at nothing.
    const italian = LANGUAGES.find((l) => l.id === 'it')!;
    const was = italian.available;
    try {
      italian.available = false;
      expect(hasLanguageChoice()).toBe(false);
    } finally {
      italian.available = was;
    }
  });
});
