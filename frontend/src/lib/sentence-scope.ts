/**
 * Which sentences a particular learner is allowed to be asked to produce, and
 * which ones they get next.
 *
 * "Everything I've covered, and nothing I haven't" sounds like a filter on
 * vocabulary. It isn't, and trying to build it that way is a trap worth
 * documenting because it looks so reasonable.
 *
 * The obvious implementation is: tokenise a candidate sentence, reject it if
 * any word hasn't been taught yet. Measured against this course, that rejects
 * roughly two thirds of perfectly valid sentences. Two reasons, both fatal:
 *
 *  1. Conjugation. The vocabulary lists `estudiar`; the sentence says
 *     `estudio`. A token filter sees an unknown word and throws out a sentence
 *     from the very lesson that teaches -ar conjugation — the one place that
 *     form is guaranteed to be in scope. Fixing this needs a Spanish
 *     lemmatiser, which is a large dependency and still wrong for irregulars.
 *
 *  2. Function words. `mi`, `un`, `en`, `a`, `su` are taught implicitly from
 *     the first week and mostly never appear as their own vocabulary entries.
 *     A token filter treats them as never-taught and rejects nearly every
 *     natural sentence.
 *
 * The right scope unit is the LESSON, not the word. A sentence written into
 * lesson N was written by someone who knew exactly what lesson N's learner had
 * seen. Completing lesson N is therefore the real, already-existing guarantee
 * that its sentences are in scope — and it needs no linguistics at all.
 *
 * So: in scope = authored by a lesson this learner has completed (or placed
 * out of at onboarding, where they told us they already knew that material).
 * Never a lesson merely unlocked-but-unfinished. That is the "nothing more".
 * The "nothing less" is the selection below, which deliberately reaches back
 * across the learner's whole history rather than only their newest lesson.
 */

import { loadProgress, type ProgressState } from './progress';
import { getCurriculum } from './curriculum';
import { sentencesForLesson, type BankSentence } from './sentence-bank';

/**
 * How much support the learner still needs on a given sentence. The ladder is
 * the feature: the same sentence is re-met with less scaffolding each time,
 * which is the only part of this that actually builds production.
 */
export type SentenceStage = 'tiles' | 'skeleton' | 'free';

export const STAGES: readonly SentenceStage[] = ['tiles', 'skeleton', 'free'];

/** The next rung up, or null once they can produce it unaided. */
export function nextStage(stage: SentenceStage): SentenceStage | null {
  const i = STAGES.indexOf(stage);
  return i >= 0 && i < STAGES.length - 1 ? STAGES[i + 1] : null;
}

export interface SentenceProgressState {
  /** Support level they'll get NEXT time this sentence comes up. */
  stage: SentenceStage;
  correct: number;
  wrong: number;
  /** ms epoch, so a sentence just practised isn't immediately repeated. */
  lastSeen: number;
}

export interface ScopedSentence extends BankSentence {
  stage: SentenceStage;
  /** True the first time this learner has ever met this sentence. */
  fresh: boolean;
}

/**
 * Every lesson whose sentences this learner has earned.
 *
 * `skipped` counts: placing out at onboarding is the learner asserting they
 * already know that material, and it already raises the tutor's level ceiling
 * and known vocabulary. Excluding it here would mean someone placed at week 12
 * gets an empty sentence section, which is worse than trusting the same claim
 * the rest of the app already trusts.
 */
export function completedSlugs(progress: ProgressState = loadProgress()): string[] {
  return getCurriculum()
    .filter((l) => {
      const rec = progress.lessons[l.slug];
      return !!rec && (rec.completed || rec.skipped);
    })
    .map((l) => l.slug);
}

/** Every sentence currently in scope for this learner, oldest lesson first. */
export function sentencesInScope(progress: ProgressState = loadProgress()): BankSentence[] {
  return completedSlugs(progress).flatMap((slug) => sentencesForLesson(slug));
}

/**
 * How many sentences one session asks for. Short on purpose: production is
 * markedly more effortful than recognition, and a 20-item free-composition
 * set is a slog rather than a session someone comes back to.
 */
export const SESSION_SIZE = 10;

/** Don't re-ask a sentence within this window unless there's nothing else. */
const COOLDOWN_MS = 6 * 60 * 60 * 1000;

/**
 * Builds a session.
 *
 * The ordering rules, in priority order, exist to make this feel like it's
 * covering the learner's whole course rather than drilling last Tuesday:
 *
 *  1. Sentences already in flight (met before, not yet at `free`) come first —
 *     an unfinished ladder is the whole point, and leaving rungs half-climbed
 *     while introducing endless new sentences would teach nothing.
 *  2. Then genuinely new sentences, oldest lesson first — so the material the
 *     learner is least likely to still have fresh gets produced, not just the
 *     lesson they finished ten minutes ago.
 *  3. Anything at `free` that they've got right is a long-term review and only
 *     fills leftover space.
 *
 * Within each band, shorter sentences first: a four-word sentence is a
 * genuinely easier production target than a nine-word one, and opening a
 * session with the hardest thing in it is how people decide they can't do
 * this.
 */
export function buildSentenceSession(
  progress: ProgressState = loadProgress(),
  size = SESSION_SIZE,
  now = Date.now()
): ScopedSentence[] {
  const scope = sentencesInScope(progress);
  const states = progress.sentences ?? {};

  const inFlight: ScopedSentence[] = [];
  const fresh: ScopedSentence[] = [];
  const mastered: ScopedSentence[] = [];

  for (const s of scope) {
    const st = states[s.id];
    if (!st) {
      fresh.push({ ...s, stage: 'tiles', fresh: true });
      continue;
    }
    // Just practised — skip unless the session can't be filled without it.
    const cold = now - st.lastSeen > COOLDOWN_MS;
    const entry: ScopedSentence = { ...s, stage: st.stage, fresh: false };
    if (st.stage !== 'free') {
      if (cold) inFlight.push(entry);
    } else if (cold) {
      mastered.push(entry);
    }
  }

  const byLength = (a: BankSentence, b: BankSentence): number => a.words - b.words;
  inFlight.sort(byLength);
  fresh.sort((a, b) => a.week - b.week || byLength(a, b));
  // Longest-ago first among long-term reviews.
  mastered.sort((a, b) => (states[a.id]?.lastSeen ?? 0) - (states[b.id]?.lastSeen ?? 0));

  return [...inFlight, ...fresh, ...mastered].slice(0, size);
}

/** Whether there's enough material for the section to be worth opening. */
export function sentenceSectionReady(progress: ProgressState = loadProgress()): boolean {
  return sentencesInScope(progress).length > 0;
}

export interface SentenceScopeSummary {
  /** Lessons whose sentences are unlocked. */
  lessons: number;
  /** Total sentences available to this learner. */
  total: number;
  /** Never attempted. */
  fresh: number;
  /** Met, but not yet produced unaided. */
  learning: number;
  /** Produced from the English alone. */
  free: number;
}

/**
 * What the learner is shown about their own scope — the honest version of
 * "everything you've covered". Deliberately reports the same numbers the
 * selection above actually uses, so the section can't claim a size it won't
 * deliver.
 */
export function sentenceScopeSummary(
  progress: ProgressState = loadProgress()
): SentenceScopeSummary {
  const scope = sentencesInScope(progress);
  const states = progress.sentences ?? {};
  let fresh = 0;
  let learning = 0;
  let free = 0;
  for (const s of scope) {
    const st = states[s.id];
    if (!st) fresh++;
    else if (st.stage === 'free') free++;
    else learning++;
  }
  return {
    lessons: completedSlugs(progress).length,
    total: scope.length,
    fresh,
    learning,
    free,
  };
}
