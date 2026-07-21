/**
 * Works out what the tutor is allowed to teach, from the learner's actual
 * progress. This is what stops Profe hitting a week-1 learner with week-5
 * grammar: we pass the reached week + the vocabulary they've genuinely met, and
 * the backend prompt treats the week as a hard ceiling.
 */
import { curriculum } from './curriculum';
import { loadProgress } from './progress';

export interface TutorContext {
  level: 'beginner' | 'intermediate' | 'advanced';
  /** Highest course week the learner has completed a lesson in. */
  weekReached: number;
  /** Spanish the learner already knows — safe for Profe to use freely. */
  knownVocab: string[];
  /** Optional lesson focus (title) when the session is launched from a lesson. */
  focus?: string;
  /** Vocabulary of the focused lesson. */
  vocab?: string[];
}

// vocab id -> Spanish, built once.
const vocabById = new Map<string, string>();
for (const lesson of curriculum) {
  for (const v of lesson.vocab) vocabById.set(v.id, v.es);
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

  const focusLesson = focusSlug ? curriculum.find((l) => l.slug === focusSlug) : undefined;

  return {
    level,
    weekReached,
    knownVocab: Array.from(known).slice(0, 150),
    focus: focusLesson?.title,
    vocab: focusLesson?.vocab.map((v) => v.es),
  };
}
