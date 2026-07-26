/**
 * A lesson runs ~55 exercises. Losing your place at item 50 and starting
 * over is the most avoidable way an 11-minute session goes unfinished.
 */
import { saveCheckpoint, loadCheckpoint, clearCheckpoint } from '../lesson-resume';
import { LESSON_CHECKPOINT_KEY } from '../keys';
import type { Exercise } from '../exercise-engine';

const stats = { answered: 12, firstTryCorrect: 10, bestCombo: 5 };

function queue(n: number): Exercise[] {
  return Array.from({ length: n }, (_, i) => ({
    type: 'type_es' as const,
    word: { id: `w${i}`, es: `palabra${i}`, en: `word${i}`, pron: '', exampleEs: '', exampleEn: '' },
  }));
}

beforeEach(() => localStorage.clear());

describe('saving and restoring a position', () => {
  it('gives back exactly where the learner left off', () => {
    saveCheckpoint({ slug: 'ser-identity', queue: queue(55), index: 40, stats, combo: 3 });

    const saved = loadCheckpoint('ser-identity')!;
    expect(saved.index).toBe(40);
    expect(saved.stats).toEqual(stats);
    expect(saved.combo).toBe(3);
  });

  it('restores the SAME queue, not a freshly shuffled one', () => {
    // The queue is shuffled at build time, so "resume at 40" is only
    // meaningful against the queue those 40 answers were given on.
    const original = queue(55);
    saveCheckpoint({ slug: 'ser-identity', queue: original, index: 40, stats, combo: 0 });

    expect(loadCheckpoint('ser-identity')!.queue.map((e) => e.word.id)).toEqual(
      original.map((e) => e.word.id)
    );
  });

  it('does not offer another lesson’s checkpoint', () => {
    saveCheckpoint({ slug: 'ser-identity', queue: queue(55), index: 40, stats, combo: 0 });
    expect(loadCheckpoint('daily-verbs')).toBeNull();
  });
});

describe('what is not worth resuming', () => {
  it('ignores a lesson that was barely started', () => {
    saveCheckpoint({ slug: 'ser-identity', queue: queue(55), index: 0, stats, combo: 0 });
    expect(loadCheckpoint('ser-identity')).toBeNull();
  });

  it('ignores a lesson that reached the end', () => {
    saveCheckpoint({ slug: 'ser-identity', queue: queue(55), index: 55, stats, combo: 0 });
    expect(loadCheckpoint('ser-identity')).toBeNull();
  });

  it('drops a checkpoint older than two days', () => {
    // By then the learner has moved on; dropping them back into the middle
    // of a half-forgotten lesson is worse than starting it properly.
    saveCheckpoint({ slug: 'ser-identity', queue: queue(55), index: 40, stats, combo: 0 });
    const stored = JSON.parse(localStorage.getItem(LESSON_CHECKPOINT_KEY)!);
    stored.savedAt = Date.now() - 49 * 60 * 60 * 1000;
    localStorage.setItem(LESSON_CHECKPOINT_KEY, JSON.stringify(stored));

    expect(loadCheckpoint('ser-identity')).toBeNull();
    expect(localStorage.getItem(LESSON_CHECKPOINT_KEY)).toBeNull(); // and cleaned up
  });

  it('survives a corrupt checkpoint rather than throwing into the lesson', () => {
    localStorage.setItem(LESSON_CHECKPOINT_KEY, '{not json');
    expect(loadCheckpoint('ser-identity')).toBeNull();
  });
});

describe('clearing', () => {
  it('removes the checkpoint for the lesson that just finished', () => {
    saveCheckpoint({ slug: 'ser-identity', queue: queue(55), index: 40, stats, combo: 0 });
    clearCheckpoint('ser-identity');
    expect(loadCheckpoint('ser-identity')).toBeNull();
  });

  it('leaves a different lesson’s checkpoint alone', () => {
    // Finishing lesson B shouldn't throw away the half-done attempt at A.
    saveCheckpoint({ slug: 'ser-identity', queue: queue(55), index: 40, stats, combo: 0 });
    clearCheckpoint('daily-verbs');
    expect(loadCheckpoint('ser-identity')).not.toBeNull();
  });
});
