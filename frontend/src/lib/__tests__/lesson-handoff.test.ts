/**
 * The course→tutor handoff.
 *
 * The failure mode this guards against isn't a crash — it's the handoff
 * quietly not appearing, or appearing pointing at a scenario that doesn't
 * exist, on some lesson nobody manually checked. Since it's now the primary
 * action on the completion screen, a null handoff means the app's whole
 * proposition silently doesn't happen for that lesson.
 */
import { handoffFor, handoffHref } from '../lesson-handoff';
import { getCurriculum, type CurriculumLesson } from '../curriculum';
import { SCENARIOS } from '../scenarios';

const curriculum = getCurriculum();

describe('every lesson has something to say out loud', () => {
  it('offers a handoff for every lesson in the course', () => {
    const without = curriculum.filter((l) => handoffFor(l) === null).map((l) => l.slug);
    expect(without).toEqual([]);
  });

  it('gives every handoff a task and words to build it from', () => {
    for (const lesson of curriculum) {
      const h = handoffFor(lesson)!;
      expect(h.task.length).toBeGreaterThan(10);
      expect(h.words.length).toBeGreaterThan(0);
      // Few enough to hold in your head while talking.
      expect(h.words.length).toBeLessThanOrEqual(3);
    }
  });

  it('keeps the promised length short', () => {
    for (const lesson of curriculum) {
      expect(handoffFor(lesson)!.minutes).toBeLessThanOrEqual(3);
    }
  });
});

describe('scenario mapping', () => {
  it('only ever names a scenario that actually exists', () => {
    // A typo here would send the learner to /tutor?scenario=shopping, which
    // silently falls back to a generic session — the exact "two products in
    // parallel" problem this is meant to fix, reintroduced invisibly.
    const ids = new Set(SCENARIOS.map((s) => s.id));
    for (const lesson of curriculum) {
      const h = handoffFor(lesson)!;
      if (h.scenario) expect(ids.has(h.scenario.id)).toBe(true);
    }
  });

  it('maps lessons whose subject genuinely is a scene', () => {
    const restaurant = curriculum.find((l) => l.slug === 'restaurant');
    expect(restaurant).toBeDefined();
    expect(handoffFor(restaurant)!.scenario?.id).toBe('restaurant');
  });

  it('leaves grammar lessons without a role-play', () => {
    // Inventing a scene for "Ser vs Estar" would be worse than asking the
    // learner to talk about themselves.
    const grammar = curriculum.find((l) => l.slug === 'ser-vs-estar');
    expect(grammar).toBeDefined();
    expect(handoffFor(grammar)!.scenario).toBeUndefined();
  });
});

describe('the link into the tutor', () => {
  const lesson = curriculum.find((l) => l.slug === 'family')!;

  it('carries the lesson and the just-finished marker', () => {
    const href = handoffHref(lesson, handoffFor(lesson)!);
    expect(href).toContain('lesson=family');
    // Without this the tutor treats it as an ordinary session and waits for
    // the learner to speak first.
    expect(href).toContain('just=1');
  });

  it('carries the scenario when there is one', () => {
    const restaurant = curriculum.find((l) => l.slug === 'restaurant')!;
    expect(handoffHref(restaurant, handoffFor(restaurant)!)).toContain('scenario=restaurant');
  });
});

describe('edge cases', () => {
  it('returns null rather than throwing for a missing lesson', () => {
    expect(handoffFor(null)).toBeNull();
    expect(handoffFor(undefined)).toBeNull();
  });

  it('returns null for a lesson with no vocabulary of its own', () => {
    // No words means the task has nothing to be about, and "go and chat" is
    // worse than no offer at all.
    const empty = { ...curriculum[0], vocab: [] } as CurriculumLesson;
    expect(handoffFor(empty)).toBeNull();
  });
});
