/**
 * Content queue for the audio-only "Listen & Repeat" practice mode — pure
 * listening and shadowing (Pimsleur/Glossika-style mass repetition), no
 * reading or typing required, so it works with your eyes off the screen.
 * Reuses the exact same due/weak-word signal as the tap-based Smart
 * Practice session (getReviewWordIds) instead of needing separate content —
 * every VocabItem already carries an example sentence, which is enough for
 * a word-in-context repetition drill.
 *
 * Graduated recall: a real Pimsleur session doesn't test each word once and
 * move on — it re-tests a word at GROWING intra-session intervals (a
 * classic pattern: a couple of items later, then several more, then quite a
 * few more) so the same word gets tested several times, at increasing
 * spacing, before the sitting ends. buildListenRepeatSession schedules that
 * directly into the queue; buildListenRepeatQueue is the flat VocabItem[]
 * view of it that the existing player consumes unchanged (a repeated word
 * is just the same VocabItem object appearing again later in the array).
 */
import { getAllVocab, getVocabById, type VocabItem } from './curriculum';
import { getReviewWordIds } from './progress';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * One slot in the built session: which word, and which presentation of it
 * this is (0 = the word's first appearance this session, 1/2/... = each
 * successive graduated retest). Exported for a future UI that might want to
 * show "you're seeing this word again" — nothing here renders anything.
 */
export interface ListenRepeatOccurrence {
  word: VocabItem;
  repeatIndex: number;
}

/**
 * Growing gaps (in queue slots) between a word's successive presentations,
 * measured from its PREVIOUS occurrence — so absolute distance from a
 * word's first appearance grows every time (2, then 2+5=7, then 7+11=18
 * slots in). This is the "increasing intra-session interval" Pimsleur/
 * Glossika mass-practice depends on: near enough to still be fresh, far
 * enough that recalling it is a real retrieval, not an echo.
 */
export const REPEAT_OFFSETS = [2, 5, 11];

/** Unique due/weak words to seed the session with, same signal as before. */
function pickBaseWords(size: number): VocabItem[] {
  const { due, weak } = getReviewWordIds(size);
  const ids = [...new Set([...due, ...weak])].slice(0, size);
  let words = ids.map((id) => getVocabById(id)).filter((w): w is VocabItem => !!w);

  // Brand new learner, or nothing due yet — sample across everything so this
  // is never just an empty "nothing to review" dead end.
  if (words.length < 6) {
    const all = getAllVocab();
    const missing = size - words.length;
    const extras = shuffle(all.filter((w) => !words.some((x) => x.id === w.id))).slice(0, missing);
    words = [...words, ...extras];
  }

  return shuffle(words);
}

/**
 * Places `word`'s first presentation at `startPos`, then schedules each
 * REPEAT_OFFSETS gap after it — sliding a repeat forward to the next free
 * slot if its ideal spot is already taken by another word's schedule. If a
 * later repeat would fall off the end of the session, it's simply dropped —
 * a word introduced near the end of a sitting realistically gets fewer
 * repeats than one introduced early, exactly like a real Pimsleur lesson.
 */
function scheduleWord(slots: (VocabItem | null)[], word: VocabItem, startPos: number): void {
  slots[startPos] = word;
  let pos = startPos;
  for (const offset of REPEAT_OFFSETS) {
    let target = pos + offset;
    while (target < slots.length && slots[target] !== null) target++;
    if (target >= slots.length) break;
    slots[target] = word;
    pos = target;
  }
}

/**
 * Builds the full graduated-recall session: `size` total slots, each filled
 * by a word introduction or one of its scheduled repeats. Prefer this over
 * buildListenRepeatQueue when the caller wants to know WHICH presentation
 * of a word a given slot is (e.g. to vary the prompt: full sentence on
 * first hearing, bare word on the graduated retest).
 */
export function buildListenRepeatSession(size = 15): ListenRepeatOccurrence[] {
  const bounded = Math.max(1, size);
  const slots: (VocabItem | null)[] = new Array(bounded).fill(null);
  const baseWords = pickBaseWords(bounded);
  let baseIdx = 0;

  for (let pos = 0; pos < bounded; pos++) {
    if (slots[pos] !== null) continue;
    if (baseIdx >= baseWords.length) break;
    scheduleWord(slots, baseWords[baseIdx++], pos);
  }

  // Any slots the schedule above never reached (ran out of distinct due/weak
  // words, or every offset kept colliding) get filled from a further shuffled
  // pass so the session never has a hole in it.
  if (slots.some((s) => s === null)) {
    const usedIds = new Set(slots.filter((s): s is VocabItem => !!s).map((w) => w.id));
    const filler = shuffle(getAllVocab().filter((w) => !usedIds.has(w.id)));
    let fillerIdx = 0;
    for (let pos = 0; pos < bounded; pos++) {
      if (slots[pos] !== null) continue;
      slots[pos] = filler.length > 0 ? filler[fillerIdx++ % filler.length] : baseWords[0];
    }
  }

  const seenCount = new Map<string, number>();
  return slots.map((word) => {
    const w = word as VocabItem;
    const repeatIndex = seenCount.get(w.id) ?? 0;
    seenCount.set(w.id, repeatIndex + 1);
    return { word: w, repeatIndex };
  });
}

/** Flat word queue for the existing player — a word can legitimately appear more than once. */
export function buildListenRepeatQueue(size = 15): VocabItem[] {
  return buildListenRepeatSession(size).map((occurrence) => occurrence.word);
}
