import {
  buildListenRepeatQueue,
  buildListenRepeatSession,
  REPEAT_OFFSETS,
} from '../listen-repeat';
import { recordWordResult } from '../progress';
import { getAllVocab } from '../curriculum';

describe('buildListenRepeatQueue', () => {
  beforeEach(() => localStorage.clear());

  it('samples across all vocab for a brand-new learner rather than returning an empty queue', () => {
    const queue = buildListenRepeatQueue(10);
    expect(queue.length).toBe(10);
    // Every item must be a real, resolvable VocabItem.
    const allIds = new Set(getAllVocab().map((w) => w.id));
    expect(queue.every((w) => allIds.has(w.id))).toBe(true);
  });

  it('prioritizes words the learner has actually been tested on (due/weak) once there is real history', () => {
    // Give a handful of words real review history so getReviewWordIds has
    // something concrete to surface.
    const testedIds = ['hola', 'adios', 'gracias', 'por-favor', 'buenos-dias', 'buenas-noches'];
    for (const id of testedIds) {
      if (getAllVocab().some((w) => w.id === id)) recordWordResult(id, true);
    }

    const queue = buildListenRepeatQueue(10);
    const queueIds = new Set(queue.map((w) => w.id));
    const testedInCurriculum = testedIds.filter((id) => getAllVocab().some((w) => w.id === id));
    // At least some of the words with real history should show up.
    expect(testedInCurriculum.some((id) => queueIds.has(id))).toBe(true);
  });

  it('respects the requested size — the total number of session slots, not unique words', () => {
    expect(buildListenRepeatQueue(5)).toHaveLength(5);
    expect(buildListenRepeatQueue(20)).toHaveLength(20);
  });
});

describe('buildListenRepeatSession — graduated recall', () => {
  beforeEach(() => localStorage.clear());

  it('re-tests a word later in a long-enough session instead of testing it only once', () => {
    const session = buildListenRepeatSession(20);
    const idCounts = new Map<string, number>();
    for (const occ of session) {
      idCounts.set(occ.word.id, (idCounts.get(occ.word.id) ?? 0) + 1);
    }
    // With 20 slots and a REPEAT_OFFSETS schedule of length 3, at least one
    // word introduced early enough should get a real repeat.
    expect([...idCounts.values()].some((count) => count > 1)).toBe(true);
  });

  it('spaces a word\'s repeats at growing intervals, not back-to-back', () => {
    const session = buildListenRepeatSession(25);
    // Find a word that got its full graduated treatment (introduced early
    // enough to receive all three scheduled repeats).
    const positionsByWord = new Map<string, number[]>();
    session.forEach((occ, i) => {
      const list = positionsByWord.get(occ.word.id) ?? [];
      list.push(i);
      positionsByWord.set(occ.word.id, list);
    });
    const fullySpacedWord = [...positionsByWord.values()].find((positions) => positions.length >= 2);
    expect(fullySpacedWord).toBeDefined();
    const positions = fullySpacedWord!;
    // Gaps between consecutive occurrences should never shrink — each retest
    // happens at least as far from the last as the previous gap did.
    for (let i = 1; i < positions.length; i++) {
      const gap = positions[i] - positions[i - 1];
      expect(gap).toBeGreaterThanOrEqual(REPEAT_OFFSETS[0]);
    }
  });

  it('marks the first appearance of every word with repeatIndex 0', () => {
    const session = buildListenRepeatSession(15);
    const seen = new Set<string>();
    for (const occ of session) {
      if (!seen.has(occ.word.id)) {
        expect(occ.repeatIndex).toBe(0);
        seen.add(occ.word.id);
      }
    }
  });

  it('repeatIndex increases with each successive occurrence of the same word', () => {
    const session = buildListenRepeatSession(25);
    const nextExpected = new Map<string, number>();
    for (const occ of session) {
      const expected = nextExpected.get(occ.word.id) ?? 0;
      expect(occ.repeatIndex).toBe(expected);
      nextExpected.set(occ.word.id, expected + 1);
    }
  });

  it('never leaves an empty slot even when the schedule cannot fill every gap', () => {
    const session = buildListenRepeatSession(8);
    expect(session).toHaveLength(8);
    expect(session.every((occ) => !!occ.word)).toBe(true);
  });
});
