/**
 * Cleaning up progress that leaked between courses.
 *
 * The sync fix stopped NEW leakage. It did nothing about the copies already
 * sitting in storage from before it — and, left alone, the corrected sync
 * would have uploaded those copies under the right language key and made the
 * corruption permanent. This is the pass that removes them.
 */
import { repairProgressForLanguage, resetCourseIndexCacheForTest } from '../course-repair';
import { getCurriculumFor } from '../curriculum';
import { setActiveLanguageId, getActiveLanguageId } from '../languages';
import { loadProgress, localDay, type ProgressState } from '../progress';
import { progressKeyFor } from '../keys';

const spanish = getCurriculumFor('es');
const italian = getCurriculumFor('it');

function stateWith(partial: Partial<ProgressState>): ProgressState {
  return {
    streak: 0,
    bestStreak: 0,
    lastActiveDay: '',
    activeDays: [],
    lessons: {},
    words: {},
    ...partial,
  };
}

/** The reported failure: a learner's Spanish progress sitting in the Italian key. */
function spanishProgressCopy(): ProgressState {
  const words: ProgressState['words'] = {};
  for (const w of spanish.flatMap((l) => l.vocab).slice(0, 108)) {
    words[w.id] = {
      strength: 3,
      correct: 3,
      wrong: 0,
      lastSeen: new Date().toISOString(),
      nextReview: new Date().toISOString(),
    };
  }
  const lessons: ProgressState['lessons'] = {};
  for (const l of spanish.filter((l) => l.week <= 5)) {
    lessons[l.slug] = { completed: true, bestAccuracy: 100, timesCompleted: 1 };
  }
  return stateWith({
    streak: 12,
    bestStreak: 12,
    lastActiveDay: localDay(),
    activeDays: [localDay()],
    lessons,
    words,
  });
}

beforeEach(() => {
  localStorage.clear();
  resetCourseIndexCacheForTest();
  setActiveLanguageId('es');
});

describe('detecting a copied course', () => {
  it('spots Spanish progress sitting in the Italian slot', () => {
    const { repaired } = repairProgressForLanguage('it', spanishProgressCopy());
    expect(repaired).toBe(true);
  });

  it('leaves genuinely Italian progress completely alone', () => {
    const words: ProgressState['words'] = {};
    for (const w of italian.flatMap((l) => l.vocab).slice(0, 20)) {
      words[w.id] = {
        strength: 2,
        correct: 2,
        wrong: 0,
        lastSeen: new Date().toISOString(),
        nextReview: new Date().toISOString(),
      };
    }
    const clean = stateWith({
      streak: 4,
      lessons: { 'essere-identity': { completed: true, bestAccuracy: 90, timesCompleted: 1 } },
      words,
    });
    const { state, repaired } = repairProgressForLanguage('it', clean);
    expect(repaired).toBe(false);
    expect(state).toBe(clean);
  });

  it('leaves a clean Spanish course alone too', () => {
    const words: ProgressState['words'] = {};
    for (const w of spanish.flatMap((l) => l.vocab).slice(0, 30)) {
      words[w.id] = {
        strength: 2,
        correct: 2,
        wrong: 0,
        lastSeen: new Date().toISOString(),
        nextReview: new Date().toISOString(),
      };
    }
    expect(repairProgressForLanguage('es', stateWith({ words })).repaired).toBe(false);
  });

  it('is idempotent — repairing twice changes nothing the second time', () => {
    const once = repairProgressForLanguage('it', spanishProgressCopy()).state;
    const twice = repairProgressForLanguage('it', once);
    expect(twice.repaired).toBe(false);
  });
});

describe('what the repair removes', () => {
  const { state } = (() => repairProgressForLanguage('it', spanishProgressCopy()))();

  it('removes every word belonging to the other course', () => {
    // The reported "108 words known" — none of them Italian.
    expect(Object.keys(state.words)).toEqual([]);
  });

  it('removes lessons the other course also has', () => {
    // greetings-essentials exists in BOTH, and a completion that was never
    // earned here would lock material the learner has never seen.
    expect(state.lessons['greetings-essentials']).toBeUndefined();
    expect(Object.keys(state.lessons)).toEqual([]);
  });

  it('resets the streak it inherited, since nothing here was ever done', () => {
    expect(state.streak).toBe(0);
    expect(state.bestStreak).toBe(0);
    expect(state.activeDays).toEqual([]);
  });
});

describe('what the repair keeps', () => {
  it('keeps lessons unique to this course, even in a contaminated blob', () => {
    // This is why `essere-identity` still showed START in the screenshots
    // while the shared slugs showed as complete — it was never copied.
    const mixed = spanishProgressCopy();
    mixed.lessons['essere-identity'] = { completed: true, bestAccuracy: 75, timesCompleted: 1 };
    const { state } = repairProgressForLanguage('it', mixed);
    expect(state.lessons['essere-identity']?.bestAccuracy).toBe(75);
    expect(state.lessons['greetings-essentials']).toBeUndefined();
  });

  it('keeps a word that belongs to no course at all', () => {
    // A renamed or retired vocabulary item is not contamination, and deleting
    // it would throw away real review history.
    const mixed = spanishProgressCopy();
    mixed.words['retired-word-id'] = {
      strength: 4,
      correct: 4,
      wrong: 0,
      lastSeen: new Date().toISOString(),
      nextReview: new Date().toISOString(),
    };
    const { state } = repairProgressForLanguage('it', mixed);
    expect(state.words['retired-word-id']).toBeDefined();
  });

  it('works in the other direction too — Italian leaking into Spanish', () => {
    const words: ProgressState['words'] = {};
    for (const w of italian.flatMap((l) => l.vocab).slice(0, 10)) {
      words[w.id] = {
        strength: 1,
        correct: 1,
        wrong: 0,
        lastSeen: new Date().toISOString(),
        nextReview: new Date().toISOString(),
      };
    }
    const spanishWord = spanish[0].vocab[0].id;
    words[spanishWord] = {
      strength: 5,
      correct: 5,
      wrong: 0,
      lastSeen: new Date().toISOString(),
      nextReview: new Date().toISOString(),
    };
    const { state, repaired } = repairProgressForLanguage('es', stateWith({ words }));
    expect(repaired).toBe(true);
    expect(state.words[spanishWord]).toBeDefined();
    expect(Object.keys(state.words)).toEqual([spanishWord]);
  });
});

describe('the repair actually reaches the learner', () => {
  it('loadProgress returns clean data and rewrites storage', () => {
    // Simulate the device as it is right now: contaminated Italian key.
    localStorage.setItem(progressKeyFor('it'), JSON.stringify(spanishProgressCopy()));
    setActiveLanguageId('it');
    expect(getActiveLanguageId()).toBe('it');

    const loaded = loadProgress();
    expect(Object.keys(loaded.words)).toEqual([]);
    expect(Object.keys(loaded.lessons)).toEqual([]);
    expect(loaded.streak).toBe(0);

    // Persisted, so the correction syncs up instead of being redone forever.
    const onDisk: ProgressState = JSON.parse(localStorage.getItem(progressKeyFor('it'))!);
    expect(Object.keys(onDisk.words)).toEqual([]);
  });
});
