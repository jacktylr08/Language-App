/**
 * Works out what the tutor is allowed to teach, from the learner's actual
 * progress. This is what stops Profe hitting a week-1 learner with week-5
 * grammar: we pass the reached week + the vocabulary they've genuinely met, and
 * the backend prompt treats the week as a hard ceiling.
 *
 * It also gives each session a backbone: the learner's *current* lesson and a
 * practical "can-do" goal, so a voice call has structure instead of drifting
 * into random phrases.
 */
import { curriculum, type CurriculumLesson } from './curriculum';
import { loadProgress } from './progress';
import { loadProfile, isEvaluationDue, dueWeaknessesFirst } from './tutor-memory';
import { buildLessonInsights } from './learner-insights';
import { loadLearnerGoal, GOAL_LABELS, type LearnerGoal } from './learner-goal';
import type { Scenario } from './scenarios';

export interface TutorContext {
  level: 'beginner' | 'intermediate' | 'advanced';
  /** Highest course week the learner has completed a lesson in. */
  weekReached: number;
  /** Spanish the learner already knows — safe for Profe to use freely. */
  knownVocab: string[];
  /** The lesson the session is focused on (title). */
  focus?: string;
  /** Vocabulary of the focused lesson. */
  vocab?: string[];
  /** A short, natural-language plan giving the session a gentle structure. */
  plan?: string;
  /** How the learner is coping — the tutor speeds up or slows down to match. */
  pace: 'slow' | 'steady' | 'brisk';
  /** True when it's time for a short evaluation conversation. */
  evaluation: boolean;
  /** Weak spots (tutor memory + lesson mistakes + pronunciation), worst first. */
  weaknesses: string[];
  /** Strengths (tutor memory + words nailed in lessons). */
  strengths: string[];
  /** Running summary of the learner from past conversations. */
  profileSummary?: string;
  /** The diary note from the learner's most recent session, if any. */
  lastSessionNote?: string;
  /** Days since that last session (0 = today). */
  daysSinceLastSession?: number;
  /** What the learner said they're here for, at onboarding. */
  learnerGoal?: LearnerGoal | null;
}

// vocab id -> Spanish, built once.
const vocabById = new Map<string, string>();
for (const lesson of curriculum) {
  for (const v of lesson.vocab) vocabById.set(v.id, v.es);
}

/** A practical "can-do" goal for each lesson theme. */
export function canDoGoal(theme: CurriculumLesson['theme']): string {
  switch (theme) {
    case 'phonetics':
      return 'greet someone and introduce yourself';
    case 'verbs':
      return 'talk about what you do day to day';
    case 'family':
      return 'talk about your family and the people in your life';
    case 'nouns':
      return 'describe your home and order food and drinks';
    case 'adjectives':
      return 'describe things around you — sizes, colours, how they are';
    case 'grammar':
      return 'build your own sentences from scratch';
    case 'conversation':
      return 'hold a real-life conversation, like ordering in a café';
    case 'review':
      return 'use everything so far together';
    default:
      return 'have a natural little conversation';
  }
}

/** Curriculum order: by week, then order within the week. */
const orderedCurriculum = [...curriculum].sort(
  (a, b) => a.week - b.week || a.order - b.order
);

/**
 * The lesson the tutor should anchor on: the learner's MOST RECENT completed
 * lesson — so it consolidates what they've actually learned rather than
 * teaching ahead into material they haven't studied yet. A learner placed
 * ahead by onboarding (earlier lessons `skipped`, not `completed`) has no
 * real completions yet, so falls through to the first lesson they haven't
 * done — their actual first real lesson, wherever the course placed them —
 * rather than "the last thing they were placed past", which they never
 * actually studied.
 */
function anchorLesson(reallyCompleted: Set<string>, doneOrPlaced: Set<string>): CurriculumLesson {
  let last: CurriculumLesson | undefined;
  for (const l of orderedCurriculum) {
    if (reallyCompleted.has(l.slug)) last = l;
  }
  if (last) return last;
  for (const l of orderedCurriculum) {
    if (!doneOrPlaced.has(l.slug)) return l;
  }
  return orderedCurriculum[0];
}

export function buildTutorContext(focusSlug?: string): TutorContext {
  const progress = loadProgress();

  // Lessons genuinely completed in the app vs. lessons placed-out-of at
  // onboarding (`skipped`) — the level ceiling and known vocab treat both as
  // "behind the learner" (doneOrPlaced), but anchoring on a specific lesson
  // to build the session plan around only ever uses a REAL completion.
  const reallyCompleted = new Set(
    Object.entries(progress.lessons)
      .filter(([, r]) => r.completed)
      .map(([slug]) => slug)
  );
  const doneOrPlaced = new Set(
    Object.entries(progress.lessons)
      .filter(([, r]) => r.completed || r.skipped)
      .map(([slug]) => slug)
  );

  // Reached week = highest week done or placed-out-of (default: week 1).
  let weekReached = 1;
  for (const lesson of curriculum) {
    if (doneOrPlaced.has(lesson.slug)) weekReached = Math.max(weekReached, lesson.week);
  }

  // Known vocab: everything from lessons done or placed-out-of (a learner
  // placed ahead at onboarding said they already know this — Profe should
  // use it freely) + any word they've been tested on. Deduped and capped so
  // the prompt stays lean.
  const known = new Set<string>();
  for (const lesson of curriculum) {
    if (doneOrPlaced.has(lesson.slug)) {
      for (const v of lesson.vocab) known.add(v.es);
    }
  }
  for (const [id, w] of Object.entries(progress.words)) {
    if (w.correct + w.wrong > 0) {
      const es = vocabById.get(id);
      if (es) known.add(es);
    }
  }

  const level: TutorContext['level'] =
    weekReached >= 13 ? 'advanced' : weekReached >= 5 ? 'intermediate' : 'beginner';

  // Adaptive pace: read recent accuracy across all graded words. Enough of a
  // sample keeps this from swinging on the first answer.
  let correct = 0;
  let wrong = 0;
  for (const w of Object.values(progress.words)) {
    correct += w.correct;
    wrong += w.wrong;
  }
  const graded = correct + wrong;
  const acc = graded > 0 ? correct / graded : null;
  const pace: TutorContext['pace'] =
    acc === null || graded < 10 ? 'steady' : acc >= 0.85 ? 'brisk' : acc <= 0.6 ? 'slow' : 'steady';

  const profile = loadProfile();
  const evaluation = isEvaluationDue(profile);

  // Merge what the tutor remembers (from conversations) with what the lessons
  // reveal (mistakes + pronunciation) — so each lesson teaches the tutor about
  // the learner. Deduped, weak spots worst-first, capped for a lean prompt.
  const insights = buildLessonInsights();
  const dedupe = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));
  const weaknesses = dedupe([
    ...dueWeaknessesFirst(profile),
    ...insights.strugglingVocab,
    ...insights.pronunciationTrouble,
  ]).slice(0, 16);
  const strengths = dedupe([...(profile?.strengths ?? []), ...insights.strongVocab]).slice(0, 14);

  // The most recent session, so the tutor can pick the conversation back up
  // like a real person would ("how did that go since last time?").
  const lastSession = profile?.history?.[0];
  const daysSinceLastSession = lastSession
    ? Math.max(0, Math.floor((Date.now() - new Date(lastSession.date).getTime()) / (24 * 60 * 60 * 1000)))
    : undefined;

  // Session focus: an explicit lesson (if launched from one), else the learner's
  // most recent completed lesson — so every call consolidates learned material
  // and never drifts into lessons they haven't done.
  const lesson =
    (focusSlug ? curriculum.find((l) => l.slug === focusSlug) : undefined) ??
    anchorLesson(reallyCompleted, doneOrPlaced);

  const targetWords = lesson.vocab
    .slice(0, 8)
    .map((v) => `${v.es} (${v.en})`)
    .join(', ');

  const coveredLine = insights.coveredRecently.length
    ? `Recently they've covered: ${insights.coveredRecently.join(', ')}. `
    : '';

  const learnerGoal = loadLearnerGoal();
  const goalLine = learnerGoal
    ? `Their stated goal for learning Spanish: "${GOAL_LABELS[learnerGoal]}" — let that colour the kind of topics and vocabulary you lean toward over time. `
    : '';

  // Use the lesson's own hand-written description as the topic — not a
  // coarse per-theme bucket. Themes like "verbs" cover both "ser-identity"
  // (introduce yourself) AND "daily-verbs" (your daily routine): collapsing
  // those into one generic goal is exactly what made calls feel generic
  // instead of tailored to what was actually just taught.
  const plan =
    `TODAY'S TOPIC — make the conversation genuinely explore this, not generic small talk: their most recent lesson was "${lesson.title}"${
      lesson.subtitle ? ` (${lesson.subtitle})` : ''
    } — ${lesson.description} ` +
    coveredLine +
    (targetWords ? `Words from it to naturally reuse: ${targetWords}. ` : '') +
    goalLine +
    `Practise and build confidence with what the learner has ALREADY learned — everything up to week ${weekReached}, and NOTHING beyond it. ` +
    `Keep it a flowing conversation, not a checklist — but steer it toward this actual topic rather than defaulting to "how's your day".`;

  return {
    level,
    weekReached,
    knownVocab: Array.from(known).slice(0, 150),
    focus: lesson.title,
    vocab: lesson.vocab.map((v) => v.es),
    plan,
    pace,
    evaluation,
    weaknesses,
    strengths,
    learnerGoal,
    profileSummary: profile?.summary,
    lastSessionNote: lastSession?.note,
    daysSinceLastSession,
  };
}

/**
 * The same context as buildTutorContext (level ceiling, known vocab, memory,
 * pace — everything that stops the tutor teaching ahead of the learner) but
 * with the plan replaced by a specific real-world scenario to role-play,
 * instead of "continue the most recent lesson". A scenario never overrides
 * the level ceiling — it's a different *topic*, not permission to use
 * material the learner hasn't met yet.
 */
export function buildScenarioContext(scenario: Scenario): TutorContext {
  const ctx = buildTutorContext();
  return {
    ...ctx,
    focus: scenario.label,
    plan: `SCENARIO PRACTICE — ${scenario.prompt} Stay within everything they've already learned (the level and known-vocabulary limits above still apply in full) — if the scenario naturally needs something beyond that, simplify it rather than introduce new material. Keep it a flowing conversation, not a checklist.`,
  };
}
