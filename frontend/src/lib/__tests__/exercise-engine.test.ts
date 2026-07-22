import { buildLessonSession, buildRetry } from '../exercise-engine';
import { curriculum } from '../curriculum';

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
