import { mergeProgress, mergeProfile } from '../sync';
import type { ProgressState } from '../progress';
import type { LearnerProfile } from '../tutor-memory';

function progress(overrides: Partial<ProgressState> = {}): ProgressState {
  return {
    streak: 0,
    bestStreak: 0,
    lastActiveDay: '',
    activeDays: [],
    lessons: {},
    words: {},
    ...overrides,
  };
}

describe('mergeProgress', () => {
  it('returns whichever side exists when the other is missing', () => {
    const a = progress({ streak: 3 });
    expect(mergeProgress(a, undefined)).toBe(a);
    expect(mergeProgress(undefined, a)).toBe(a);
  });

  it('is additive: never loses streak or lesson completion from either device', () => {
    const a = progress({
      streak: 3,
      bestStreak: 5,
      lessons: { 'greetings-essentials': { completed: true, bestAccuracy: 80, timesCompleted: 1 } },
    });
    const b = progress({
      streak: 1,
      bestStreak: 2,
      lessons: { 'greetings-essentials': { completed: false, bestAccuracy: 95, timesCompleted: 2 } },
    });

    const merged = mergeProgress(a, b)!;

    expect(merged.bestStreak).toBe(5);
    expect(merged.lessons['greetings-essentials'].completed).toBe(true); // OR: completed on either side stays completed
    expect(merged.lessons['greetings-essentials'].bestAccuracy).toBe(95); // max
    expect(merged.lessons['greetings-essentials'].timesCompleted).toBe(2); // max
  });

  it('merges per-word stats by taking the max of each side (never regresses strength)', () => {
    const a = progress({
      words: { hola: { strength: 4, correct: 5, wrong: 1, lastSeen: '2026-01-01', nextReview: '2026-01-10' } },
    });
    const b = progress({
      words: { hola: { strength: 2, correct: 3, wrong: 2, lastSeen: '2026-01-05', nextReview: '2026-01-08' } },
    });

    const merged = mergeProgress(a, b)!;
    expect(merged.words.hola).toEqual({
      strength: 4,
      correct: 5,
      wrong: 2,
      lastSeen: '2026-01-05',
      nextReview: '2026-01-10',
    });
  });

  it('keeps the FSRS scheduling state from whichever side has more review history, not just whichever is listed first', () => {
    const fsrsCard = (reps: number) => ({
      due: '2026-02-01T00:00:00.000Z',
      stability: 5,
      difficulty: 5,
      elapsed_days: 0,
      scheduled_days: 3,
      learning_steps: 0,
      reps,
      lapses: 0,
      state: 2,
    });
    const a = progress({ words: { hola: { strength: 3, correct: 3, wrong: 0, lastSeen: '', nextReview: '', fsrs: fsrsCard(2) } } });
    const b = progress({ words: { hola: { strength: 3, correct: 3, wrong: 0, lastSeen: '', nextReview: '', fsrs: fsrsCard(5) } } });

    // b has more actual reviews behind it — losing that on merge would reset
    // the word's difficulty/stability model as if it were brand new.
    expect(mergeProgress(a, b)!.words.hola.fsrs?.reps).toBe(5);
    expect(mergeProgress(b, a)!.words.hola.fsrs?.reps).toBe(5);
  });

  it('unions active days from both devices instead of picking one side', () => {
    const a = progress({ activeDays: ['2026-01-01', '2026-01-03'] });
    const b = progress({ activeDays: ['2026-01-02', '2026-01-03'] });
    const merged = mergeProgress(a, b)!;
    expect(merged.activeDays).toEqual(['2026-01-01', '2026-01-02', '2026-01-03']);
  });
});

function profile(overrides: Partial<LearnerProfile> = {}): LearnerProfile {
  return {
    summary: '',
    strengths: [],
    weaknesses: [],
    mistakes: [],
    updatedAt: '',
    ...overrides,
  };
}

describe('mergeProfile', () => {
  it('returns whichever side exists when the other is null/undefined', () => {
    const a = profile({ summary: 'a' });
    expect(mergeProfile(a, null)).toBe(a);
    expect(mergeProfile(undefined, a)).toBe(a);
  });

  it('takes the fresher profile for scalar fields but unions session history from both devices', () => {
    const a = profile({
      updatedAt: '2026-01-05T00:00:00.000Z',
      summary: 'Older summary from device A',
      history: [{ date: '2026-01-04T00:00:00.000Z', note: 'Session on device A', mistakes: [] }],
    });
    const b = profile({
      updatedAt: '2026-01-06T00:00:00.000Z',
      summary: 'Newer summary from device B',
      history: [{ date: '2026-01-06T00:00:00.000Z', note: 'Session on device B', mistakes: [] }],
    });

    const merged = mergeProfile(a, b)!;

    expect(merged.summary).toBe('Newer summary from device B'); // fresher wins for scalar fields
    // Neither device's session is lost, even though b "won" the scalar fields.
    expect(merged.history?.map((h) => h.note)).toEqual(
      expect.arrayContaining(['Session on device A', 'Session on device B'])
    );
    expect(merged.history).toHaveLength(2);
  });

  it('deduplicates a session that was synced from both devices instead of doubling it up', () => {
    const shared = { date: '2026-01-06T00:00:00.000Z', note: 'Same session synced twice', mistakes: [] };
    const a = profile({ updatedAt: '2026-01-06T00:00:00.000Z', history: [shared] });
    const b = profile({ updatedAt: '2026-01-06T00:00:00.000Z', history: [shared] });

    const merged = mergeProfile(a, b)!;
    expect(merged.history).toHaveLength(1);
  });
});
