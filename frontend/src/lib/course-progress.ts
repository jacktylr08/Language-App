/**
 * Where a learner stands in the course: what's unlocked, what's next, and
 * what's newly appeared behind them.
 *
 * This lives outside the lessons page because getting it wrong is expensive.
 * The original rule — "a lesson unlocks once the immediately-previous entry
 * in the curriculum array is done" — looks equivalent to what's here, but
 * silently breaks the moment a lesson is inserted mid-course: for every
 * learner already past the insertion point, the lesson right after the new
 * one re-locks (its predecessor, the brand-new lesson, isn't done) and the
 * "continue" pointer jumps backwards to the insertion. Nothing is actually
 * lost — every completion is still on record — but it reads exactly like
 * wiped progress, which is worse than a bug that merely looks like one.
 *
 * Anchoring on furthest-reached instead means growing the curriculum can
 * only ever ADD something to try; it can never take away what was earned.
 */
import type { LessonRecord, ProgressState } from './progress';
import { isLessonDone } from './progress';

/** Minimal shape needed from a curriculum lesson — keeps this testable without the real 3.5k-line course. */
export interface CourseLessonLike {
  slug: string;
}

export interface CoursePosition {
  /** Index of the last lesson behind the learner (done or placed-out-of). -1 for a brand-new learner. */
  lastDoneIndex: number;
  /** Index of the lesson to continue with, or -1 once the whole course is behind them. */
  currentIndex: number;
  /** True if that lesson is available to open. */
  isUnlocked: (index: number) => boolean;
  /**
   * Lessons sitting BEFORE the learner's furthest point that they've never
   * done — i.e. material added to earlier weeks after they'd already moved
   * past. Not the same as "skipped": these didn't exist when they got here.
   */
  newlyAvailableIndexes: number[];
}

export function computeCoursePosition(
  curriculum: readonly CourseLessonLike[],
  lessons: Record<string, LessonRecord>
): CoursePosition {
  const done = (index: number): boolean => isLessonDone(lessons[curriculum[index].slug]);

  let lastDoneIndex = -1;
  for (let i = 0; i < curriculum.length; i++) {
    if (done(i)) lastDoneIndex = i;
  }

  // Everything up to and including one past the furthest completion. For a
  // learner working straight through, this is identical to the old rule.
  const isUnlocked = (index: number): boolean => index <= lastDoneIndex + 1;

  // Always points forward, so newly-inserted earlier lessons never drag the
  // learner back to a week they finished months ago.
  let currentIndex = -1;
  for (let i = lastDoneIndex + 1; i < curriculum.length; i++) {
    if (!done(i)) {
      currentIndex = i;
      break;
    }
  }

  const newlyAvailableIndexes: number[] = [];
  for (let i = 0; i < lastDoneIndex; i++) {
    if (!done(i)) newlyAvailableIndexes.push(i);
  }

  return { lastDoneIndex, currentIndex, isUnlocked, newlyAvailableIndexes };
}

/** Convenience for callers that already hold a full ProgressState. */
export function coursePositionFor(
  curriculum: readonly CourseLessonLike[],
  progress: ProgressState
): CoursePosition {
  return computeCoursePosition(curriculum, progress.lessons);
}

/**
 * The lesson a "start learning" button should open.
 *
 * The welcome screen used to route to the literal string
 * `/lessons/greetings-essentials`. That is curriculum identity hard-coded
 * into a UI component, and it breaks silently in every direction the course
 * is allowed to move: renaming the slug, reordering week one, switching the
 * active language to one whose first lesson is called something else, or
 * letting a placement result choose a later starting point. The button would
 * keep rendering and land on a 404.
 *
 * Resolving it from the curriculum means the same button is correct for
 * every language and every future edit to the course.
 */
export function getStartingLesson<T extends CourseLessonLike>(
  curriculum: readonly T[],
  progress: ProgressState
): T | null {
  if (curriculum.length === 0) return null;
  const { currentIndex } = computeCoursePosition(curriculum, progress.lessons);
  // -1 means the whole course is behind them; send them to the last lesson
  // rather than nowhere, so the button is never dead.
  return currentIndex >= 0 ? curriculum[currentIndex] : curriculum[curriculum.length - 1];
}
