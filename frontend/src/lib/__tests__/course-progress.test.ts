import { computeCoursePosition } from '../course-progress';
import type { LessonRecord } from '../progress';

const completed = (): LessonRecord => ({ completed: true, bestAccuracy: 90, timesCompleted: 1 });
const placedOut = (): LessonRecord => ({
  completed: false,
  bestAccuracy: 0,
  timesCompleted: 0,
  skipped: true,
});

function course(...slugs: string[]) {
  return slugs.map((slug) => ({ slug }));
}

describe('computeCoursePosition', () => {
  it('unlocks only the first lesson for a brand-new learner', () => {
    const pos = computeCoursePosition(course('a', 'b', 'c'), {});
    expect(pos.lastDoneIndex).toBe(-1);
    expect(pos.isUnlocked(0)).toBe(true);
    expect(pos.isUnlocked(1)).toBe(false);
    expect(pos.currentIndex).toBe(0);
  });

  it('unlocks exactly one lesson past the furthest completion, as before', () => {
    const pos = computeCoursePosition(course('a', 'b', 'c', 'd'), {
      a: completed(),
      b: completed(),
    });
    expect(pos.isUnlocked(2)).toBe(true);
    expect(pos.isUnlocked(3)).toBe(false);
    expect(pos.currentIndex).toBe(2);
  });

  it('treats a lesson placed out of at signup as behind the learner', () => {
    const pos = computeCoursePosition(course('a', 'b', 'c'), { a: placedOut(), b: placedOut() });
    expect(pos.lastDoneIndex).toBe(1);
    expect(pos.currentIndex).toBe(2);
  });

  describe('regression: a lesson inserted mid-course must not look like wiped progress', () => {
    // The learner finished a, b, c, d. Then "new" is inserted between b and c.
    const withInsertion = course('a', 'b', 'new', 'c', 'd');
    const theirProgress = { a: completed(), b: completed(), c: completed(), d: completed() };

    it('never re-locks a lesson the learner already completed', () => {
      const pos = computeCoursePosition(withInsertion, theirProgress);
      withInsertion.forEach((lesson, i) => {
        if (theirProgress[lesson.slug as keyof typeof theirProgress]) {
          expect(pos.isUnlocked(i)).toBe(true);
        }
      });
    });

    it('keeps "continue" pointing forward, not back at the insertion point', () => {
      const pos = computeCoursePosition(withInsertion, theirProgress);
      // Their furthest point is 'd' (index 4) — the whole course is behind
      // them, so there is nothing ahead to continue with.
      expect(pos.lastDoneIndex).toBe(4);
      expect(pos.currentIndex).toBe(-1);
    });

    it('still reports the inserted lesson as newly available rather than hiding it', () => {
      const pos = computeCoursePosition(withInsertion, theirProgress);
      expect(pos.newlyAvailableIndexes).toEqual([2]);
      expect(withInsertion[2].slug).toBe('new');
    });

    it('leaves the inserted lesson openable', () => {
      const pos = computeCoursePosition(withInsertion, theirProgress);
      expect(pos.isUnlocked(2)).toBe(true);
    });

    it('points continue at the next unseen lesson ahead when there is one', () => {
      // Same insertion, but they had only reached 'c'.
      const pos = computeCoursePosition(withInsertion, {
        a: completed(),
        b: completed(),
        c: completed(),
      });
      expect(pos.lastDoneIndex).toBe(3); // 'c'
      expect(pos.currentIndex).toBe(4); // 'd', forward — not 'new' at index 2
      expect(pos.newlyAvailableIndexes).toEqual([2]);
    });
  });
});
