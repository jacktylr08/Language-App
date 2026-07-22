import { touchStreak, currentStreak, recordWordResult, getMistakeWordIds, loadProgress, recentActivity } from '../progress';
import type { ProgressState } from '../progress';

function setNow(iso: string) {
  jest.setSystemTime(new Date(iso));
}

describe('streaks', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts a streak of 1 on the first day of activity', () => {
    setNow('2026-01-10T09:00:00.000Z');
    const state = touchStreak();
    expect(state.streak).toBe(1);
    expect(state.bestStreak).toBe(1);
    expect(currentStreak(state)).toBe(1);
  });

  it('extends the streak on consecutive days', () => {
    setNow('2026-01-10T09:00:00.000Z');
    touchStreak();
    setNow('2026-01-11T09:00:00.000Z');
    const state = touchStreak();
    expect(state.streak).toBe(2);
    expect(state.bestStreak).toBe(2);
  });

  it('resets the streak to 1 after a missed day', () => {
    setNow('2026-01-10T09:00:00.000Z');
    touchStreak();
    setNow('2026-01-13T09:00:00.000Z'); // skipped the 11th and 12th
    const state = touchStreak();
    expect(state.streak).toBe(1);
    expect(state.bestStreak).toBe(1); // the earlier streak of 1 isn't beaten
  });

  it('reports 0 once a day has been missed, without corrupting stored state', () => {
    setNow('2026-01-10T09:00:00.000Z');
    touchStreak();
    setNow('2026-01-13T09:00:00.000Z');
    const stale = loadProgress();
    expect(currentStreak(stale)).toBe(0);
    expect(stale.streak).toBe(1); // the raw stored value is untouched until they act again
  });

  it('does not bump the streak twice on the same day', () => {
    setNow('2026-01-10T09:00:00.000Z');
    touchStreak();
    const state = touchStreak();
    expect(state.streak).toBe(1);
  });
});

describe('recordWordResult', () => {
  beforeEach(() => localStorage.clear());

  it('increases strength (capped at 5) on repeated correct answers', () => {
    for (let i = 0; i < 8; i++) recordWordResult('hola', true);
    const state = loadProgress();
    expect(state.words.hola.strength).toBe(5);
    expect(state.words.hola.correct).toBe(8);
  });

  it('drops strength by 2 (floored at 0) on a wrong answer', () => {
    recordWordResult('hola', true); // strength -> 1
    recordWordResult('hola', false); // strength -> max(0, 1-2) = 0
    const state = loadProgress();
    expect(state.words.hola.strength).toBe(0);
    expect(state.words.hola.wrong).toBe(1);
  });
});

describe('getMistakeWordIds', () => {
  beforeEach(() => localStorage.clear());

  it('excludes words that have since been practised back up to strength', () => {
    recordWordResult('hola', false); // stays weak -> included
    for (let i = 0; i < 8; i++) recordWordResult('gracias', true); // never wrong -> excluded

    const ids = getMistakeWordIds();
    expect(ids).toContain('hola');
    expect(ids).not.toContain('gracias');
  });

  it('drops a word once it recovers to strength 4+, even if it was once wrong', () => {
    recordWordResult('adios', false);
    for (let i = 0; i < 5; i++) recordWordResult('adios', true); // climbs back to strength 5

    expect(getMistakeWordIds()).not.toContain('adios');
  });

  it('sorts the most-missed word first', () => {
    recordWordResult('hola', false);
    recordWordResult('hola', false);
    recordWordResult('adios', false);

    expect(getMistakeWordIds()[0]).toBe('hola');
  });
});

describe('recentActivity', () => {
  function state(activeDays: string[]): ProgressState {
    return { streak: 0, bestStreak: 0, lastActiveDay: '', activeDays, lessons: {}, words: {} };
  }

  it('returns one entry per day, oldest first, ending today', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-10T12:00:00.000Z'));

    const days = recentActivity(state(['2026-01-10', '2026-01-08']), 5);

    // 2026-01-06, 07, 08, 09, 10
    expect(days).toEqual([false, false, true, false, true]);
    jest.useRealTimers();
  });

  it('reports all-inactive for a brand-new learner with no activity yet', () => {
    expect(recentActivity(state([]), 7)).toEqual(new Array(7).fill(false));
  });
});
