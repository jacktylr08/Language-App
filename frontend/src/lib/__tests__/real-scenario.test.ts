import { getCurriculum } from '../curriculum';
import { computeCoursePosition } from '../course-progress';
import type { LessonRecord } from '../progress';

/**
 * Guards the real, shipped curriculum against the failure that actually hit a
 * learner: seven lessons were added to weeks 6-20 of a course people were
 * already partway through, and the then-current unlock rule ("the previous
 * array entry must be done") re-locked completed lessons and pointed
 * "continue" backwards to week 6. Nothing was deleted, but it read as a
 * total wipe.
 *
 * This runs against the genuine curriculum rather than a synthetic fixture,
 * so it keeps failing if a future content insertion reintroduces the problem.
 */
const LESSONS_ADDED_MID_COURSE = [
  'vosotros',
  'yo-irregulars-present',
  'saber-vs-conocer',
  'por-vs-para',
  'double-object-pronouns',
  'usted-commands',
  'subjunctive-deeper',
];

/** What a learner's save file looked like BEFORE the new lessons existed. */
function progressAsOfWeek(week: number): Record<string, LessonRecord> {
  const lessons: Record<string, LessonRecord> = {};
  for (const l of getCurriculum()) {
    if (l.week <= week && !LESSONS_ADDED_MID_COURSE.includes(l.slug)) {
      lessons[l.slug] = { completed: true, bestAccuracy: 90, timesCompleted: 1 };
    }
  }
  return lessons;
}

describe('mid-course curriculum growth never looks like lost progress', () => {
  // Spread across every insertion point, not just one.
  it.each([4, 6, 8, 10, 14, 18, 22])(
    'a learner who had reached week %i keeps every completed lesson unlocked',
    (week) => {
      const curriculum = getCurriculum();
      const lessons = progressAsOfWeek(week);
      const pos = computeCoursePosition(curriculum, lessons);

      const reLocked = curriculum.filter((l, i) => lessons[l.slug] && !pos.isUnlocked(i));
      expect(reLocked.map((l) => l.slug)).toEqual([]);
    }
  );

  it('keeps "continue" pointing forwards, never back to an inserted earlier lesson', () => {
    const curriculum = getCurriculum();
    const pos = computeCoursePosition(curriculum, progressAsOfWeek(10));

    expect(pos.currentIndex).toBeGreaterThanOrEqual(0);
    // They finished week 10 — the next thing must not be back in week 6.
    expect(curriculum[pos.currentIndex].week).toBeGreaterThanOrEqual(10);
  });

  it('still surfaces the newly-inserted earlier lessons instead of burying them', () => {
    const curriculum = getCurriculum();
    const pos = computeCoursePosition(curriculum, progressAsOfWeek(10));
    const newlyAvailable = pos.newlyAvailableIndexes.map((i) => curriculum[i].slug);

    // The two that sit inside the weeks they'd already completed.
    expect(newlyAvailable).toContain('vosotros');
    expect(newlyAvailable).toContain('yo-irregulars-present');
  });
});
