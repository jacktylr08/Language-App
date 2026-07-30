import { buildTutorContext, buildScenarioContext, buildHandoffContext } from '../tutor-context';
import { completeLessonLocal, placeLearnerAtWeek } from '../progress';
import { getCurriculum } from '../curriculum';
import { saveLearnerGoal } from '../learner-goal';
import { SCENARIOS } from '../scenarios';

const curriculum = getCurriculum();

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

  it('feeds the learner-stated goal from onboarding into the session plan', () => {
    saveLearnerGoal('travel');
    const ctx = buildTutorContext();
    expect(ctx.learnerGoal).toBe('travel');
    expect(ctx.plan).toContain('Prepare for travel');
  });

  it('omits the goal line entirely when no goal was ever set', () => {
    const ctx = buildTutorContext();
    expect(ctx.learnerGoal).toBeNull();
    expect(ctx.plan).not.toMatch(/stated goal/i);
  });
});

describe('buildTutorContext with onboarding placement (skipped lessons)', () => {
  beforeEach(() => localStorage.clear());

  it('raises the level ceiling and known vocab for a learner placed ahead at onboarding, with zero real completions', () => {
    placeLearnerAtWeek(5); // "beginner" level — skips Phase 1 (weeks 1-4)
    const ctx = buildTutorContext();

    expect(ctx.weekReached).toBeGreaterThanOrEqual(4);
    // The skipped lessons' vocab is "known" — Profe should use it freely,
    // exactly as if the learner had actually completed those lessons.
    const skippedLesson = curriculum.find((l) => l.slug === 'greetings-essentials')!;
    expect(ctx.knownVocab).toEqual(expect.arrayContaining(skippedLesson.vocab.map((v) => v.es)));
  });

  it('anchors on the first real lesson to do, not the last one placed past, when nothing has actually been completed', () => {
    placeLearnerAtWeek(5);
    const ctx = buildTutorContext();

    // Should focus on the first week-5 lesson (their actual next real
    // lesson) — never a skipped lesson they never studied in the app.
    const firstRealLesson = [...curriculum].sort((a, b) => a.week - b.week || a.order - b.order)
      .find((l) => l.week >= 5)!;
    expect(ctx.focus).toBe(firstRealLesson.title);
  });

  it('still anchors on the most recent REAL completion when one exists, ignoring skipped lessons entirely', () => {
    placeLearnerAtWeek(5);
    completeLessonLocal('ar-verbs', 88); // a real, actual completion at week 5
    const ctx = buildTutorContext();

    expect(ctx.focus).toBe('The -AR Verb Machine');
  });

  it('a complete beginner (no placement) is completely unaffected', () => {
    const ctx = buildTutorContext();
    expect(ctx.weekReached).toBe(1);
    expect(ctx.level).toBe('beginner');
  });
});

describe('buildScenarioContext', () => {
  beforeEach(() => localStorage.clear());

  it('replaces the focus/plan with the scenario, but keeps the level ceiling from real progress', () => {
    for (const lesson of curriculum.filter((l) => l.week <= 5)) {
      completeLessonLocal(lesson.slug, 90);
    }
    const restaurant = SCENARIOS.find((s) => s.id === 'restaurant')!;
    const ctx = buildScenarioContext(restaurant);

    expect(ctx.focus).toBe('At a restaurant');
    expect(ctx.plan).toContain('SCENARIO PRACTICE');
    expect(ctx.plan).toContain(restaurant.prompt);
    // Everything that stops the tutor teaching ahead still comes from real progress.
    expect(ctx.weekReached).toBeGreaterThanOrEqual(5);
    expect(ctx.level).toBe('intermediate');
  });

  it('never lets a scenario bypass the level ceiling for a brand-new learner', () => {
    const jobInterview = SCENARIOS.find((s) => s.id === 'job-interview')!;
    const ctx = buildScenarioContext(jobInterview);
    expect(ctx.weekReached).toBe(1);
    expect(ctx.level).toBe('beginner');
    expect(ctx.plan).toMatch(/level and known-vocabulary limits/i);
  });
});

describe('buildHandoffContext', () => {
  beforeEach(() => localStorage.clear());

  /**
   * A learner reported the tutor call felt like it had nothing to do with the
   * lesson they'd just finished. Tracing it found a real bug: the backend
   * truncates `plan` at a fixed character budget (routes/tutor.ts), and the
   * handoff's plan text — built from the lesson title, the task, and a word
   * list — could exceed it for a long lesson, silently cutting off the very
   * instruction that opens the conversation. These pin the plan to essential-
   * information-first and to a length that survives truncation.
   */
  it('opens with the essential instruction before anything that could be cut', () => {
    const ctx = buildHandoffContext(
      'family',
      'Describe your family to Profe',
      ['padre', 'madre', 'hermana']
    );
    expect(ctx.plan).toBeDefined();
    const openIdx = ctx.plan!.indexOf('OPEN THE CONVERSATION YOURSELF');
    expect(openIdx).toBeGreaterThan(-1);
    // Well inside even the tighter of the two backend limits (1400 chars),
    // with headroom for a long lesson title and six words.
    expect(openIdx).toBeLessThan(400);
  });

  it('stays within the backend truncation budget for a long lesson title and full word list', () => {
    const ctx = buildHandoffContext(
      'storytelling-mastery',
      'Tell Profe about a memorable trip or experience, using the past tense',
      ['viajé', 'recuerdo', 'inolvidable', 'aventura', 'sorpresa', 'emocionante']
    );
    expect(ctx.plan!.length).toBeLessThan(1400);
  });

  it('carries the task and words into the plan', () => {
    const ctx = buildHandoffContext('family', 'Describe your family to Profe', [
      'padre',
      'madre',
      'hermana',
    ]);
    expect(ctx.plan).toContain('Describe your family to Profe');
    expect(ctx.plan).toContain('padre, madre, hermana');
  });

  it('uses the scenario plan instead when one is given, but still opens the call', () => {
    const restaurant = SCENARIOS.find((s) => s.id === 'restaurant')!;
    const ctx = buildHandoffContext('restaurant', 'Order food from Profe', ['comida'], restaurant);
    expect(ctx.focus).toBe(restaurant.label);
    expect(ctx.plan).toContain('OPEN THE CONVERSATION YOURSELF');
  });

  it('still respects the level ceiling from real progress', () => {
    for (const lesson of curriculum.filter((l) => l.week <= 5)) {
      completeLessonLocal(lesson.slug, 90);
    }
    const ctx = buildHandoffContext('family', 'Describe your family to Profe', ['padre']);
    expect(ctx.weekReached).toBeGreaterThanOrEqual(5);
  });
});
