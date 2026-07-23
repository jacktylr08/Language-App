/**
 * Placement — how a new learner's starting week gets decided.
 *
 * Historically this was a pure 4-option self-report ("beginner / some /
 * intermediate / advanced") that cascaded straight into BOTH the lesson
 * unlock week AND the tutor's assumed-known-vocabulary set, with zero actual
 * verification — a self-reported "advanced" learner got treated as knowing
 * vocabulary they had never actually been tested on.
 *
 * This module now also builds a short (10 question) adaptive diagnostic,
 * sampling real vocab/grammar questions from across the course's own
 * content via getCurriculum()/getAllVocab() (see buildPlacementQuestionPool)
 * rather than inventing disconnected quiz questions. It's a simple staircase,
 * not full IRT/CAT: a right answer moves to a harder question, a wrong
 * answer moves to an easier one. The band the learner settles on at the end
 * maps directly onto the course's own 6 phases (see phaseForWeek), giving a
 * starting week that's actually earned rather than merely claimed.
 *
 * The old self-report (LearnerLevel / LEVEL_OPTIONS / startWeekForLevel) is
 * kept as a fast, honest opt-out for a learner who tells us outright they've
 * never studied Spanish at all — for them, running a 10-question diagnostic
 * would just be friction before their first real lesson.
 */
import { getCurriculum, type CurriculumLesson, type VocabItem } from './curriculum';

export type LearnerLevel = 'new' | 'beginner' | 'intermediate' | 'advanced';

export interface LevelOption {
  value: LearnerLevel;
  label: string;
  description: string;
}

export const LEVEL_OPTIONS: LevelOption[] = [
  {
    value: 'new',
    label: 'Complete beginner',
    description: "I know a few words at most — start me from zero, no quiz needed.",
  },
  {
    value: 'beginner',
    label: 'Some basics',
    description: "I know a bit — I'll take the quick placement quiz.",
  },
  {
    value: 'intermediate',
    label: 'Conversational',
    description: "I can get by in conversations — I'll take the quick placement quiz.",
  },
  {
    value: 'advanced',
    label: 'Advanced',
    description: "I'm fairly fluent — I'll take the quick placement quiz.",
  },
];

/** The course week a self-reported level should start at. 1 = no skip. */
export function startWeekForLevel(level: LearnerLevel): number {
  switch (level) {
    case 'beginner':
      return 5; // skip Phase 1 (Foundations)
    case 'intermediate':
      return 13; // skip Phases 1-3 (through The Past & Future)
    case 'advanced':
      return 21; // skip Phases 1-5 (through Power Grammar)
    default:
      return 1; // complete beginner — nothing to skip
  }
}

// ============================================================================
// Adaptive placement diagnostic
// ============================================================================

/** Number of course phases the diagnostic can place someone into (see phaseForWeek). */
export const BAND_COUNT = 6;
/** The starting week of each band — identical to phaseForWeek's own 4-week phase boundaries. */
const BAND_START_WEEK = [1, 5, 9, 13, 17, 21];
/** Kept short on purpose — a placement check, not an exam. */
export const PLACEMENT_QUIZ_LENGTH = 10;

export interface PlacementQuestion {
  id: string;
  /** Difficulty band, 0 (earliest) to BAND_COUNT - 1 (latest). */
  band: number;
  prompt: string;
  options: string[];
  correctAnswer: string;
}

export interface PlacementHistoryEntry {
  id: string;
  band: number;
  correct: boolean;
}

export interface PlacementProgress {
  /** The band the NEXT question should be drawn from (also the final placement band once the quiz ends). */
  band: number;
  askedIds: string[];
  correctCount: number;
  history: PlacementHistoryEntry[];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function clampBand(band: number): number {
  return Math.max(0, Math.min(BAND_COUNT - 1, band));
}

/** Which band a course week falls into — the inverse of BAND_START_WEEK. */
function bandForWeek(week: number): number {
  for (let b = BAND_COUNT - 1; b >= 0; b--) {
    if (week >= BAND_START_WEEK[b]) return b;
  }
  return 0;
}

/** The course week a given band starts at — the same phase boundaries phaseForWeek uses. */
export function bandStartWeek(band: number): number {
  return BAND_START_WEEK[clampBand(band)];
}

/**
 * Builds the pool of candidate questions the diagnostic draws from, straight
 * from the shipped curriculum — never invented content. Two sources per band:
 *   1. The lesson's own conceptChecks (real grammar questions, already
 *      MCQ-shaped with a correct answer) — one per lesson so no single topic
 *      dominates a band.
 *   2. Vocab translation checks built from that band's own taught words,
 *      with distractors drawn from the same band (so a wrong answer reflects
 *      not knowing THAT word, not an unfairly easy/hard distractor set).
 */
export function buildPlacementQuestionPool(curriculum: CurriculumLesson[] = getCurriculum()): PlacementQuestion[] {
  const pool: PlacementQuestion[] = [];
  const vocabByBand = new Map<number, VocabItem[]>();

  for (const lesson of curriculum) {
    const band = bandForWeek(lesson.week);

    if (lesson.conceptChecks?.length) {
      const check = lesson.conceptChecks[0];
      pool.push({
        id: `concept-${lesson.slug}`,
        band,
        prompt: check.question,
        options: check.options,
        correctAnswer: check.correct,
      });
    }

    if (lesson.vocab.length) {
      if (!vocabByBand.has(band)) vocabByBand.set(band, []);
      vocabByBand.get(band)!.push(...lesson.vocab);
    }
  }

  for (const [band, words] of vocabByBand) {
    const sample = shuffle(words).slice(0, 5);
    for (const w of sample) {
      const distractorPool = words.filter((x) => x.id !== w.id && x.en !== w.en);
      const distractors = shuffle(distractorPool).slice(0, 3).map((x) => x.en);
      // Not enough distinct vocab in this band to build a fair 4-option question.
      if (distractors.length < 3) continue;
      pool.push({
        id: `vocab-${w.id}`,
        band,
        prompt: `What does "${w.es}" mean?`,
        options: shuffle([w.en, ...distractors]),
        correctAnswer: w.en,
      });
    }
  }

  return pool;
}

/** Starting state for a fresh diagnostic — begins in the middle band. */
export function initialPlacementProgress(): PlacementProgress {
  return { band: Math.floor(BAND_COUNT / 2), askedIds: [], correctCount: 0, history: [] };
}

/**
 * Picks the next question: prefers the current band, widening outward to
 * neighbouring bands if that band's pool is already exhausted. Returns null
 * once the whole pool has been asked (shouldn't happen with a real
 * curriculum-sized pool and a 10-question quiz, but keeps callers safe).
 */
export function pickNextPlacementQuestion(
  pool: PlacementQuestion[],
  progress: PlacementProgress
): PlacementQuestion | null {
  const asked = new Set(progress.askedIds);
  const unasked = pool.filter((q) => !asked.has(q.id));
  if (unasked.length === 0) return null;

  for (let radius = 0; radius < BAND_COUNT; radius++) {
    const candidates = unasked.filter((q) => Math.abs(q.band - progress.band) === radius);
    if (candidates.length > 0) return shuffle(candidates)[0];
  }
  return shuffle(unasked)[0];
}

/** Staircase step: right answer → harder band, wrong answer → easier band. */
export function recordPlacementAnswer(
  progress: PlacementProgress,
  question: PlacementQuestion,
  wasCorrect: boolean
): PlacementProgress {
  const band = clampBand(progress.band + (wasCorrect ? 1 : -1));
  return {
    band,
    askedIds: [...progress.askedIds, question.id],
    correctCount: progress.correctCount + (wasCorrect ? 1 : 0),
    history: [...progress.history, { id: question.id, band: question.band, correct: wasCorrect }],
  };
}

export function isPlacementQuizComplete(progress: PlacementProgress): boolean {
  return progress.history.length >= PLACEMENT_QUIZ_LENGTH;
}

/**
 * The course week to actually start at. Because `band` is re-adjusted after
 * every answer (see recordPlacementAnswer), by the time the quiz ends it
 * already reflects the learner's demonstrated level — no separate scoring
 * pass needed.
 */
export function startWeekForPlacement(progress: PlacementProgress): number {
  return bandStartWeek(progress.band);
}
