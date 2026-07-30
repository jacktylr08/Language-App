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

/**
 * Long enough not to re-ask something in the session you just finished, short
 * enough that coming back the same evening still advances the ladder.
 *
 * This was six hours, which quietly broke the entire feature. A sentence
 * answered correctly is promoted and stamped with `lastSeen`, so a six-hour
 * lock meant every in-flight sentence was invisible for the rest of the day
 * while the hundreds of untouched ones were all, by definition, at `tiles`.
 * The result: every session was 100% "Build it", and the skeleton and free
 * rungs were unreachable in any realistic sitting. The ladder existed in the
 * data model and never once appeared on screen.
 */
const COOLDOWN_MS = 20 * 60 * 1000;

/** Fisher-Yates, with an injectable source so tests are deterministic. */
function shuffle<T>(items: T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Picks from every lesson in turn rather than draining the oldest first.
 *
 * "Everything I've covered" means the whole range should show up, not the
 * first lesson over and over. Sorting new material oldest-first did exactly
 * that: a learner twenty lessons in kept being handed week-one sentences and
 * never saw the material they'd just worked through. Round-robin across the
 * completed lessons puts the learner's whole history in every session.
 */
function spreadAcrossLessons(items: ScopedSentence[], rng: () => number): ScopedSentence[] {
  const byLesson = new Map<string, ScopedSentence[]>();
  for (const s of items) {
    const list = byLesson.get(s.slug);
    if (list) list.push(s);
    else byLesson.set(s.slug, [s]);
  }
  // Shuffle within each lesson so repeat sessions don't replay one fixed order.
  const queues = Array.from(byLesson.values()).map((list) => shuffle(list, rng));
  const out: ScopedSentence[] = [];
  let any = true;
  while (any) {
    any = false;
    for (const q of queues) {
      const next = q.shift();
      if (next) {
        out.push(next);
        any = true;
      }
    }
  }
  return out;
}

/**
 * Builds a session.
 *
 * Two things this has to get right, both of which the first version got wrong:
 *
 *  - VARIETY. Selection used a fully deterministic sort, so leaving a session
 *    without finishing handed back the identical ten sentences next time, and
 *    even completing one just walked down the same fixed list. Everything is
 *    now shuffled and spread across lessons.
 *
 *  - A MIX OF RUNGS. Fresh sentences are always at `tiles`, and there are
 *    hundreds of them, so filling a session by priority meant tiles crowded
 *    out everything else forever. In-flight sentences (the ones with a ladder
 *    half-climbed) are now taken FIRST and up to a guaranteed share of the
 *    session, so skeleton and free actually appear.
 *
 * Ordering within the session is deliberately gentle: shorter sentences and
 * lower rungs first, so it opens on something winnable.
 */
export function buildSentenceSession(
  progress: ProgressState = loadProgress(),
  size = SESSION_SIZE,
  now = Date.now(),
  rng: () => number = Math.random
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
    // Just practised — don't repeat it in the very next session.
    if (now - st.lastSeen <= COOLDOWN_MS) continue;
    const entry: ScopedSentence = { ...s, stage: st.stage, fresh: false };
    if (st.stage !== 'free') inFlight.push(entry);
    else mastered.push(entry);
  }

  const rank = (s: ScopedSentence): number => STAGES.indexOf(s.stage);
  // Least-recently-practised first, so the ladder advances broadly rather than
  // hammering whichever sentence happens to sort first.
  const inFlightOrdered = shuffle(inFlight, rng).sort(
    (a, b) => (states[a.id]?.lastSeen ?? 0) - (states[b.id]?.lastSeen ?? 0)
  );
  const freshOrdered = spreadAcrossLessons(fresh, rng);
  const masteredOrdered = shuffle(mastered, rng).sort(
    (a, b) => (states[a.id]?.lastSeen ?? 0) - (states[b.id]?.lastSeen ?? 0)
  );

  // Each pool gets a reserved share of the session, so no one of them can
  // crowd the others out. Leftovers from an under-filled pool spill to the
  // others, so a session is always full if there's material for it at all.
  //
  // The `free` pool needs a reservation as much as the others do: without one
  // it only ever filled leftover slots, and since there are hundreds of
  // untouched sentences there were never any leftovers — so a sentence the
  // learner had worked all the way up to unaided production was then never
  // seen again, which is both the wrong pedagogy and exactly the "it only
  // does the build it round" complaint.
  const pools: Array<[ScopedSentence[], number]> = [
    [inFlightOrdered, 0.4],
    [freshOrdered, 0.4],
    [masteredOrdered, 0.2],
  ];
  const picked: ScopedSentence[] = [];
  const have = new Set<string>();
  const take = (list: ScopedSentence[], n: number): void => {
    for (const s of list) {
      if (n <= 0 || picked.length >= size) return;
      if (have.has(s.id)) continue;
      picked.push(s);
      have.add(s.id);
      n--;
    }
  };
  for (const [list, share] of pools) take(list, Math.round(size * share));
  // Backfill in the same priority order.
  for (const [list] of pools) take(list, size - picked.length);

  // Open on the easiest thing in the set.
  return picked.sort((a, b) => rank(a) - rank(b) || a.words - b.words).slice(0, size);
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
