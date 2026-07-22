import { buildLessonSession, buildReviewSession, buildMistakesSession, buildRetry, sentenceTiles } from '../exercise-engine';
import { curriculum, getAllVocab } from '../curriculum';
import { recordWordResult } from '../progress';

describe('buildLessonSession — free-composition writing exercise', () => {
  it('adds exactly one write_answer capstone for a lesson with enough vocab', () => {
    const lesson = curriculum.find((l) => l.slug === 'ser-identity')!;
    const queue = buildLessonSession(lesson, false);
    const writing = queue.filter((e) => e.type === 'write_answer');
    expect(writing).toHaveLength(1);
    expect(writing[0].writingPrompt?.suggested).toHaveLength(3);
    expect(writing[0].noWordTracking).toBe(true);
  });

  it('omits the writing exercise for review lessons (no vocab of their own)', () => {
    const review = curriculum.find((l) => l.isReview)!;
    const queue = buildLessonSession(review, false);
    expect(queue.some((e) => e.type === 'write_answer')).toBe(false);
  });
});

describe('buildRetry — write_answer', () => {
  it('re-serves the same prompt rather than falling back to an unrelated drill', () => {
    const lesson = curriculum.find((l) => l.slug === 'ser-identity')!;
    const queue = buildLessonSession(lesson, false);
    const original = queue.find((e) => e.type === 'write_answer')!;
    const retry = buildRetry(original, lesson.vocab);
    expect(retry.type).toBe('write_answer');
    expect(retry.writingPrompt).toEqual(original.writingPrompt);
    expect(retry.isRetry).toBe(true);
  });
});

describe('buildLessonSession — general structure', () => {
  const lesson = curriculum.find((l) => l.slug === 'ser-identity')!;

  it('teaches every vocab word before drilling it', () => {
    const queue = buildLessonSession(lesson, false);
    const taughtBefore = (wordId: string) => {
      const teachIdx = queue.findIndex((e) => e.type === 'teach' && e.word.id === wordId);
      const firstDrillIdx = queue.findIndex(
        (e) => e.word.id === wordId && e.type !== 'teach'
      );
      return teachIdx !== -1 && (firstDrillIdx === -1 || teachIdx < firstDrillIdx);
    };
    for (const w of lesson.vocab) {
      expect(taughtBefore(w.id)).toBe(true);
    }
  });

  it('includes the lesson dialogue as a slide when the lesson has one', () => {
    const withDialogue = curriculum.find((l) => l.slug === 'restaurant')!;
    const queue = buildLessonSession(withDialogue, false);
    const slide = queue.find((e) => e.type === 'dialogue_slide');
    expect(slide?.dialogue).toEqual(withDialogue.dialogue);
  });
});

describe('buildReviewSession', () => {
  beforeEach(() => localStorage.clear());

  it('prioritises words the learner has actually got wrong before', () => {
    const target = getAllVocab()[0];
    recordWordResult(target.id, false);
    recordWordResult(target.id, false);
    const queue = buildReviewSession(null, false, 12);
    expect(queue.some((e) => e.word.id === target.id)).toBe(true);
  });

  it('falls back to sampling prior vocab when nothing is tracked yet', () => {
    const queue = buildReviewSession(null, false, 12);
    expect(queue.length).toBeGreaterThan(0);
  });
});

describe('buildMistakesSession', () => {
  beforeEach(() => localStorage.clear());

  it('is empty when nothing has been missed', () => {
    expect(buildMistakesSession(false)).toEqual([]);
  });

  it('surfaces a word after it has been missed', () => {
    const target = getAllVocab()[1];
    recordWordResult(target.id, false);
    const queue = buildMistakesSession(false, 16);
    expect(queue.some((e) => e.word.id === target.id)).toBe(true);
  });
});

describe('sentenceTiles', () => {
  it('strips punctuation and splits on whitespace', () => {
    expect(sentenceTiles('¿Cómo estás, amigo?')).toEqual(['Cómo', 'estás', 'amigo']);
  });
});

describe('buildRetry — other exercise types', () => {
  const pool = getAllVocab();
  const word = pool[0];

  it('turns a missed typing exercise into a multiple-choice retry', () => {
    const retry = buildRetry({ type: 'type_es', word }, pool);
    expect(retry.type).toBe('mcq_en_es');
    expect(retry.isRetry).toBe(true);
    expect(retry.options).toContain(word.es);
  });

  it('turns a missed speaking exercise into a multiple-choice retry', () => {
    const retry = buildRetry({ type: 'speak', word }, pool);
    expect(retry.type).toBe('mcq_en_es');
    expect(retry.isRetry).toBe(true);
  });

  it('reshuffles the tiles when retrying a missed build_sentence', () => {
    const build = { es: 'Yo soy de España', en: 'I am from Spain' };
    const original = { type: 'build_sentence' as const, word, build, tiles: ['Yo', 'soy', 'de', 'España'] };
    const retry = buildRetry(original, pool);
    expect(retry.type).toBe('build_sentence');
    expect(retry.tiles?.sort()).toEqual(original.tiles.sort());
    expect(retry.isRetry).toBe(true);
  });
});
