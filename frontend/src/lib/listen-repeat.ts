/**
 * Content queue for the audio-only "Listen & Repeat" practice mode — pure
 * listening and shadowing (Pimsleur/Glossika-style mass repetition), no
 * reading or typing required, so it works with your eyes off the screen.
 * Reuses the exact same due/weak-word signal as the tap-based Smart
 * Practice session (getReviewWordIds) instead of needing separate content —
 * every VocabItem already carries an example sentence, which is enough for
 * a word-in-context repetition drill.
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

export function buildListenRepeatQueue(size = 15): VocabItem[] {
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

  return shuffle(words).slice(0, size);
}
