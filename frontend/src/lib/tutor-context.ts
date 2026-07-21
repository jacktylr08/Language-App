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
import { loadProfile, isEvaluationDue } from './tutor-memory';

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
 * The lesson the learner is "on": the first one they haven't completed, or the
 * last lesson if they've finished everything.
 */
function currentLesson(completed: Set<string>): CurriculumLesson {
  return (
    orderedCurriculum.find((l) => !completed.has(l.slug)) ??
    orderedCurriculum[orderedCurriculum.length - 1]
  );
}

export function buildTutorContext(focusSlug?: string): TutorContext {
  const progress = loadProgress();

  const completed = new Set(
    Object.entries(progress.lessons)
      .filter(([, r]) => r.completed)
      .map(([slug]) => slug)
  );

  // Reached week = highest week with a completed lesson (default: week 1).
  let weekReached = 1;
  for (const lesson of curriculum) {
    if (completed.has(lesson.slug)) weekReached = Math.max(weekReached, lesson.week);
  }

  // Known vocab: everything from completed lessons + any word they've been
  // tested on. Deduped and capped so the prompt stays lean.
  const known = new Set<string>();
  for (const lesson of curriculum) {
    if (completed.has(lesson.slug)) {
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

  const evaluation = isEvaluationDue(loadProfile());

  // Session focus: an explicit lesson (if launched from one), else the lesson
  // the learner is currently on — so every call has a subject and a goal.
  const lesson =
    (focusSlug ? curriculum.find((l) => l.slug === focusSlug) : undefined) ??
    currentLesson(completed);

  const targetWords = lesson.vocab
    .slice(0, 8)
    .map((v) => `${v.es} (${v.en})`)
    .join(', ');

  const plan =
    `Today, loosely centre things on the lesson "${lesson.title}"${
      lesson.subtitle ? ` — ${lesson.subtitle}` : ''
    }. ` +
    (targetWords ? `Weave in some of these when it fits: ${targetWords}. ` : '') +
    `The real goal is for the learner to get comfortable being able to ${canDoGoal(lesson.theme)}. ` +
    `Keep it a natural conversation, not a checklist — this is just a gentle backbone.`;

  return {
    level,
    weekReached,
    knownVocab: Array.from(known).slice(0, 150),
    focus: lesson.title,
    vocab: lesson.vocab.map((v) => v.es),
    plan,
    pace,
    evaluation,
  };
}
