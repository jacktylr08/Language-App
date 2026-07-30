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
import { getCurriculum, type CurriculumLesson } from './curriculum';
import { loadProgress, weekReachedFor } from './progress';
import { loadProfile, isEvaluationDue, dueWeaknessesFirst } from './tutor-memory';
import { buildLessonInsights } from './learner-insights';
import { loadLearnerGoal, GOAL_LABELS, type LearnerGoal } from './learner-goal';
import { getActiveLanguage, getActiveLanguageId } from './languages';
import type { Scenario } from './scenarios';

export interface TutorContext {
  level: 'beginner' | 'intermediate' | 'advanced';
  /** English name of the course language, e.g. "Spanish" — what the backend prompt is actually teaching. */
  languageName: string;
  /** Highest course week the learner has completed a lesson in. */
  weekReached: number;
  /** Target-language words the learner already knows — safe for Profe to use freely. */
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

// vocab id -> Spanish. Rebuilt only when the active language actually
// changes (not on every call) rather than once at module load, which would
// keep serving the first language's vocab forever after a future language
// switch — ES module top-level code only ever runs once.
let cachedLanguageId: string | null = null;
let vocabById = new Map<string, string>();
let orderedCurriculum: CurriculumLesson[] = [];

function refreshForActiveLanguage(): void {
  const id = getActiveLanguageId();
  if (id === cachedLanguageId) return;
  cachedLanguageId = id;
  const all = getCurriculum();
  vocabById = new Map();
  for (const lesson of all) {
    for (const v of lesson.vocab) vocabById.set(v.id, v.es);
  }
  orderedCurriculum = [...all].sort((a, b) => a.week - b.week || a.order - b.order);
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
  refreshForActiveLanguage();
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

  const weekReached = weekReachedFor(progress);

  // Known vocab: everything from lessons done or placed-out-of (a learner
  // placed ahead at onboarding said they already know this — Profe should
  // use it freely) + any word they've been tested on. Deduped and capped so
  // the prompt stays lean.
  const known = new Set<string>();
  for (const lesson of orderedCurriculum) {
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
    (focusSlug ? orderedCurriculum.find((l) => l.slug === focusSlug) : undefined) ??
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
    languageName: getActiveLanguage().name,
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

/**
 * The context for a call opened straight off the back of finishing a lesson.
 *
 * Different from the ordinary lesson-focused context in one way that matters:
 * the learner finished this ninety seconds ago and pressed a button offering a
 * two-minute conversation. That sets expectations the tutor has to meet.
 *
 * It must open by giving them something to say. A learner who has never had a
 * conversation in the language, arriving at a screen that says "start
 * talking", says nothing — so Profe speaks first, with a question narrow
 * enough to be answerable using the handful of words they've just met. And it
 * must stay short: this was sold as two minutes, and a tutor who launches into
 * a fifteen-minute lesson has broken the same promise the welcome screen used
 * to break.
 */
export function buildHandoffContext(
  focusSlug: string,
  task: string,
  targetWords: string[],
  scenario?: Scenario
): TutorContext {
  const base = scenario ? buildScenarioContext(scenario) : buildTutorContext(focusSlug);
  const words = targetWords.slice(0, 6).join(', ');

  return {
    ...base,
    plan:
      `JUST FINISHED A LESSON — the learner completed "${base.focus}" moments ago and came straight here to use it. ` +
      `Their task, as the app described it to them: "${task}". ` +
      (words ? `Words they have just this minute learned: ${words}. Give them openings to use these. ` : '') +
      `OPEN THE CONVERSATION YOURSELF with one short, concrete, easily-answerable question that invites exactly that — do not wait for them to start, and do not open with "what would you like to talk about". ` +
      `Keep this SHORT: aim for roughly two minutes and four or five exchanges. They were promised a quick go, not a lesson. ` +
      `Praise a genuine use of the new material specifically when it happens. ` +
      `When it feels complete, tell them warmly that they have just used it for real and can end the call. ` +
      (scenario ? '' : `Stay entirely within what they already know — nothing beyond week ${base.weekReached}.`),
  };
}
