import { buildListenRepeatQueue } from '../listen-repeat';
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

  it('never returns duplicate words in one queue', () => {
    const queue = buildListenRepeatQueue(12);
    const ids = queue.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
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

  it('respects the requested size', () => {
    expect(buildListenRepeatQueue(5)).toHaveLength(5);
  });
});
