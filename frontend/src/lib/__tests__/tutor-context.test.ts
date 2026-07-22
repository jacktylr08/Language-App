import { buildTutorContext } from '../tutor-context';
import { completeLessonLocal } from '../progress';
import { curriculum } from '../curriculum';

describe('buildTutorContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('anchors a brand-new learner on the very first lesson, at beginner level', () => {
    const first = [...curriculum].sort((a, b) => a.week - b.week || a.order - b.order)[0];
    const ctx = buildTutorContext();
    expect(ctx.weekReached).toBe(1);
    expect(ctx.level).toBe('beginner');
    expect(ctx.focus).toBe(first.title);
  });

  it('regression: after finishing week 1, stays anchored in week 1 — never teaches ahead into week 2', () => {
    // Reported bug: after completing only week-1 lessons, the tutor opened
    // with "what do you do every day" — week-2 material — because it used to
    // anchor on the next UNCOMPLETED lesson instead of the most recent one
    // actually finished.
    completeLessonLocal('greetings-essentials', 90);
    completeLessonLocal('ser-identity', 85);

    const ctx = buildTutorContext();

    expect(ctx.weekReached).toBe(1);
    expect(ctx.focus).toBe('To Be & Identity'); // the last WEEK-1 lesson completed
    expect(ctx.plan).toContain('week 1');
    expect(ctx.plan).not.toMatch(/week 2/i);
  });

  it('raises the level once week 5+ material has actually been completed', () => {
    for (const lesson of curriculum.filter((l) => l.week <= 5)) {
      completeLessonLocal(lesson.slug, 90);
    }
    const ctx = buildTutorContext();
    expect(ctx.weekReached).toBeGreaterThanOrEqual(5);
    expect(ctx.level).toBe('intermediate');
  });

  it('lets an explicit lesson focus override the anchor (launching a call from a specific lesson)', () => {
    completeLessonLocal('greetings-essentials', 90);
    const ctx = buildTutorContext('daily-verbs');
    expect(ctx.focus).toBe('Daily Action Verbs');
  });

  it('regression: the plan reflects the specific lesson, not a generic theme bucket', () => {
    // Reported bug: "ser-identity" (introduce yourself, say where you're
    // from) shares its `theme` ('verbs') with the unrelated "daily-verbs"
    // lesson (talk about your daily routine). Deriving the topic from theme
    // alone made the tutor ask generic "how's your day" chit-chat instead of
    // anything about identity — the plan must use the lesson's own
    // description instead.
    completeLessonLocal('greetings-essentials', 90);
    completeLessonLocal('ser-identity', 85);

    const ctx = buildTutorContext();

    expect(ctx.plan).toContain('Introduce yourself and describe people');
    expect(ctx.plan).not.toMatch(/day to day/i);
  });
});
