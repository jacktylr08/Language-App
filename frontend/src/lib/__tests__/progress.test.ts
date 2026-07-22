import { addXp, currentStreak, recordWordResult, getMistakeWordIds, loadProgress } from '../progress';

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
    const state = addXp(10);
    expect(state.streak).toBe(1);
    expect(state.bestStreak).toBe(1);
    expect(currentStreak(state)).toBe(1);
  });

  it('extends the streak on consecutive days', () => {
    setNow('2026-01-10T09:00:00.000Z');
    addXp(10);
    setNow('2026-01-11T09:00:00.000Z');
    const state = addXp(10);
    expect(state.streak).toBe(2);
    expect(state.bestStreak).toBe(2);
  });

  it('resets the streak to 1 after a missed day', () => {
    setNow('2026-01-10T09:00:00.000Z');
    addXp(10);
    setNow('2026-01-13T09:00:00.000Z'); // skipped the 11th and 12th
    const state = addXp(10);
    expect(state.streak).toBe(1);
    expect(state.bestStreak).toBe(1); // the earlier streak of 1 isn't beaten
  });

  it('reports 0 once a day has been missed, without corrupting stored state', () => {
    setNow('2026-01-10T09:00:00.000Z');
    addXp(10);
    setNow('2026-01-13T09:00:00.000Z');
    const stale = loadProgress();
    expect(currentStreak(stale)).toBe(0);
    expect(stale.streak).toBe(1); // the raw stored value is untouched until they act again
  });

  it('does not double-count XP or bump the streak twice on the same day', () => {
    setNow('2026-01-10T09:00:00.000Z');
    addXp(10);
    const state = addXp(5);
    expect(state.streak).toBe(1);
    expect(state.xp).toBe(15);
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
