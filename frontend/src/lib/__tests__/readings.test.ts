import {
  READINGS,
  getReading,
  normalizeToken,
  lookupWord,
  reconcileReadingProgress,
} from '../readings';
import { loadProgress } from '../progress';

describe('READINGS content', () => {
  it('every passage has a unique slug', () => {
    const slugs = READINGS.map((r) => r.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('minWeek is non-decreasing across the phases (easier passages unlock first)', () => {
    const weeks = READINGS.map((r) => r.minWeek);
    const sorted = [...weeks].sort((a, b) => a - b);
    expect(weeks).toEqual(sorted);
  });

  it('gives every course week something to read', () => {
    // Extensive reading only works on volume — that's the whole premise of
    // the model this is built on. Eight of the 24 weeks used to have no
    // passage at all, so a learner hit a wall and the habit broke.
    const weeks = new Set(READINGS.map((r) => r.minWeek));
    const empty = [];
    for (let w = 1; w <= 24; w++) if (!weeks.has(w)) empty.push(w);
    expect(empty).toEqual([]);
  });

  it('keeps enough reading volume for the habit to be worth having', () => {
    // The module shipped with 16 passages / ~1,800 Spanish words — about
    // fifteen minutes of reading across a six-month course.
    const words = READINGS.reduce((n, r) => n + r.text.split(/\s+/).filter(Boolean).length, 0);
    expect(READINGS.length).toBeGreaterThanOrEqual(50);
    expect(words).toBeGreaterThanOrEqual(4000);
  });

  it('glosses enough of each passage to be readable without a dictionary', () => {
    // A passage whose unknown words aren't glossed isn't extensive reading,
    // it's a translation exercise.
    const thin = READINGS.filter((r) => Object.keys(r.glossary ?? {}).length < 8).map((r) => r.slug);
    expect(thin).toEqual([]);
  });

  it('getReading resolves a real slug and returns undefined for an unknown one', () => {
    expect(getReading(READINGS[0].slug)?.title).toBe(READINGS[0].title);
    expect(getReading('not-a-real-slug')).toBeUndefined();
  });
});

describe('normalizeToken', () => {
  it('lowercases and strips leading/trailing punctuation', () => {
    expect(normalizeToken('¡Hola!')).toBe('hola');
    expect(normalizeToken('"Buenos días,"')).toBe('buenos días');
    expect(normalizeToken('familia.')).toBe('familia');
  });

  it('returns an empty string for punctuation-only tokens', () => {
    expect(normalizeToken('—')).toBe('');
    expect(normalizeToken('.')).toBe('');
  });
});

describe('lookupWord', () => {
  const passage = getReading('mi-familia')!;

  it('resolves a word that matches tracked curriculum vocab', () => {
    const result = lookupWord('¡Hola!', passage);
    expect(result?.en).toBe('hello');
    expect(result?.vocabId).toBe('hola');
  });

  it('falls back to the passage glossary for untracked connector words', () => {
    const result = lookupWord('mi', passage);
    expect(result?.en).toMatch(/my/i);
    expect(result?.vocabId).toBeUndefined();
  });

  it('returns null for a word with no gloss anywhere', () => {
    expect(lookupWord('xyzabc', passage)).toBeNull();
  });

  it('returns null for punctuation-only tokens', () => {
    expect(lookupWord('—', passage)).toBeNull();
  });
});

describe('reconcileReadingProgress', () => {
  const passage = getReading('mi-familia')!;

  beforeEach(() => localStorage.clear());

  it('records every tracked word in the passage exactly once, even if repeated', () => {
    reconcileReadingProgress(passage, new Set());
    const state = loadProgress();
    // "familia" appears multiple times in the passage — only one WordState entry.
    expect(state.words['familia']).toBeDefined();
    expect(state.words['familia'].correct).toBe(1);
  });

  it('marks tapped words as a wrong/needs-review signal, and untapped tracked words as correct', () => {
    // "hola" is tracked vocab in this passage; tap it for help.
    const result = reconcileReadingProgress(passage, new Set(['hola']));
    const state = loadProgress();

    expect(state.words['hola'].wrong).toBe(1);
    expect(state.words['hola'].correct).toBe(0);
    expect(result.reviewed).toBeGreaterThanOrEqual(1);
    expect(result.recognized).toBeGreaterThanOrEqual(1);
  });

  it('never touches FSRS state for untracked glossary-only words', () => {
    reconcileReadingProgress(passage, new Set());
    const state = loadProgress();
    // "mi" is glossary-only (not a tracked single-word VocabItem) — no WordState.
    expect(state.words['mi']).toBeUndefined();
  });
});
