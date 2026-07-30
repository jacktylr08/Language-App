/**
 * Marking a whole sentence.
 *
 * The existing single-word checker (matchAnswer) can't do this job. It returns
 * one verdict for the entire string, so a nine-word sentence with one wrong
 * article comes back as flatly "wrong" — which is both discouraging and
 * useless, because the learner is left to diff two sentences by eye to work
 * out what they actually got wrong. Its typo tolerance is also a fixed edit
 * distance of one across the whole string, which is far too strict once the
 * string is a sentence rather than a word.
 *
 * So this marks word by word and returns the alignment. That turns feedback
 * from "no" into "everything was right except this one word", which is the
 * difference between a learner correcting a specific belief and a learner
 * concluding they can't do sentences.
 */

import { levenshtein } from './speech';
import { sentenceWords } from './sentence-bank';
import { getCurriculum } from './curriculum';
import { getActiveLanguageId } from './languages';

/** Lower-cased, punctuation-free, accents intact. */
function normWord(w: string): string {
  return w.toLowerCase().replace(/[¿?¡!.,;:"'—–]/g, '');
}

/** As above, with accents stripped — for "right word, missed the accent". */
function looseWord(w: string): string {
  return normWord(w)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/**
 * Every word form the course teaches, accent-stripped.
 *
 * This exists to stop typo tolerance forgiving a real word. Edit distance
 * alone says `padre` is one keystroke from `madre` and waves it through — but
 * they're different words with different meanings, and a section whose whole
 * job is teaching composition cannot mark "my father is a doctor" correct
 * when the target was "my mother is a doctor". Spanish is full of meaningful
 * minimal pairs (padre/madre, casa/cosa, como/cómo, tu/tú), so this isn't an
 * edge case, it's the common case.
 *
 * The rule: a one-character difference is a typo only when what the learner
 * wrote isn't itself a word. If it is a word, they chose the wrong one.
 */
let cachedVocabLanguage: string | null = null;
let knownForms = new Set<string>();

function isRealWord(loose: string): boolean {
  const id = getActiveLanguageId();
  if (id !== cachedVocabLanguage) {
    cachedVocabLanguage = id;
    knownForms = new Set();
    for (const lesson of getCurriculum()) {
      for (const v of lesson.vocab) {
        for (const tok of v.es.split(/\s+/)) {
          const w = looseWord(tok);
          if (w) knownForms.add(w);
        }
      }
    }
  }
  return knownForms.has(loose);
}

export type WordVerdict = 'correct' | 'accent' | 'typo' | 'wrong' | 'missing' | 'extra';

export interface MarkedWord {
  /** What the learner wrote, or the expected word for a `missing` slot. */
  text: string;
  /** The expected word, when it differs and is worth showing. */
  expected?: string;
  verdict: WordVerdict;
}

export interface SentenceResult {
  /** True when the sentence counts as produced correctly. */
  correct: boolean;
  /** Right words, wrong accents or a small typo — correct, but worth a nudge. */
  nearMiss: boolean;
  /** Word-by-word alignment against the target, for rendering the diff. */
  words: MarkedWord[];
  /** One short human sentence, or empty when there's nothing worth saying. */
  note: string;
}

/**
 * Marks an attempt against the target sentence.
 *
 * Word order is enforced — in Spanish it carries real meaning, and a section
 * whose entire purpose is composition cannot accept a bag of correct words in
 * any arrangement. Accents and small typos are forgiven with a nudge, because
 * this is a test of whether you can build the sentence, not of your spelling.
 */
export function checkSentence(attempt: string, target: string): SentenceResult {
  const got = sentenceWords(attempt).map((w) => w.trim()).filter(Boolean);
  const want = sentenceWords(target);

  const marked: MarkedWord[] = [];
  let hardErrors = 0;
  let softErrors = 0;

  const len = Math.max(got.length, want.length);
  for (let i = 0; i < len; i++) {
    const g = got[i];
    const w = want[i];

    if (g === undefined) {
      marked.push({ text: w, verdict: 'missing' });
      hardErrors++;
      continue;
    }
    if (w === undefined) {
      marked.push({ text: g, verdict: 'extra' });
      hardErrors++;
      continue;
    }

    if (normWord(g) === normWord(w)) {
      marked.push({ text: g, verdict: 'correct' });
    } else if (looseWord(g) === looseWord(w)) {
      marked.push({ text: g, expected: w, verdict: 'accent' });
      softErrors++;
    } else if (
      looseWord(w).length >= 4 &&
      levenshtein(looseWord(g), looseWord(w)) === 1 &&
      // ...and only if what they wrote isn't itself a real word — see
      // isRealWord. Otherwise `padre` passes as a typo for `madre`.
      !isRealWord(looseWord(g))
    ) {
      marked.push({ text: g, expected: w, verdict: 'typo' });
      softErrors++;
    } else {
      marked.push({ text: g, expected: w, verdict: 'wrong' });
      hardErrors++;
    }
  }

  const correct = hardErrors === 0;
  const nearMiss = correct && softErrors > 0;

  let note = '';
  if (correct && softErrors > 0) {
    const accents = marked.filter((m) => m.verdict === 'accent');
    note = accents.length
      ? `Spot on — just the accent: ${accents.map((m) => m.expected).join(', ')}.`
      : 'That counts — just a slip of the fingers.';
  } else if (!correct) {
    // Name the FIRST thing that went wrong rather than listing everything.
    // A learner fixes one belief at a time, and a wall of corrections on a
    // sentence they half-knew reads as failure rather than instruction.
    const first = marked.find(
      (m) => m.verdict === 'wrong' || m.verdict === 'missing' || m.verdict === 'extra'
    );
    if (first?.verdict === 'wrong') note = `Not quite — “${first.text}” should be “${first.expected}”.`;
    else if (first?.verdict === 'missing') note = `Almost — you're missing “${first.text}”.`;
    else if (first?.verdict === 'extra') note = `Close — “${first.text}” isn't needed here.`;
  }

  return { correct, nearMiss, words: marked, note };
}

/**
 * The gapped version of a sentence, for the middle rung of the ladder.
 *
 * Which words to blank is the whole design of this stage. Blanking at random
 * produces either a giveaway (every function word removed, content words left
 * in place) or an impossible cloze. So: content words go, function words stay.
 * The learner is left holding the sentence's shape — which is precisely the
 * thing they already have and don't need practice at — and has to supply the
 * meaning-bearing words, which is the thing they can't do.
 */
const FUNCTION_WORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'de', 'del', 'a', 'al', 'en', 'con', 'por', 'para', 'sin', 'sobre',
  'y', 'o', 'pero', 'que', 'qué', 'no', 'sí',
  'mi', 'mis', 'tu', 'tus', 'su', 'sus', 'me', 'te', 'se', 'le', 'lo', 'nos',
  'yo', 'tú', 'él', 'ella', 'usted', 'nosotros', 'vosotros', 'ellos', 'ellas',
  'es', 'está', 'muy', 'más', 'ya', 'también',
]);

export interface Skeleton {
  /** Sentence tokens; a null entry is a gap the learner must fill. */
  slots: Array<{ text: string; gap: boolean }>;
  /** The words removed, in order — the answer key for the gaps. */
  answers: string[];
}

export function buildSkeleton(target: string): Skeleton {
  const words = sentenceWords(target);
  const contentIdx = words
    .map((w, i) => ({ w, i }))
    .filter(({ w }) => !FUNCTION_WORDS.has(looseWord(w)));

  // Roughly a third of the SENTENCE, not half the content words.
  //
  // Half-the-content-words looks equivalent and isn't: in a short sentence
  // almost every word is a content word, so "Mucho gusto, Marta" had two of
  // its three words blanked and the learner was shown "___ ___ Marta" — the
  // free stage with a name attached, not a frame to complete. Measuring
  // against the whole sentence keeps a real skeleton visible at every length,
  // and at least one content word always survives as an anchor.
  const maxGaps = contentIdx.length > 1 ? contentIdx.length - 1 : 1;
  const target_gaps = Math.max(1, Math.min(Math.round(words.length / 3), maxGaps));
  // Evenly spaced across the sentence rather than clustered at the start, so
  // the learner has to hold the whole structure rather than one region.
  const step = contentIdx.length / target_gaps;
  const chosen = new Set<number>();
  for (let k = 0; k < target_gaps; k++) {
    const pick = contentIdx[Math.min(contentIdx.length - 1, Math.floor(k * step))];
    if (pick) chosen.add(pick.i);
  }
  // Degenerate case: a sentence made entirely of function words ("¿Qué es
  // esto?"). Blank one anyway so the stage still asks for production.
  if (chosen.size === 0 && words.length > 0) chosen.add(words.length - 1);

  return {
    slots: words.map((w, i) => ({ text: w, gap: chosen.has(i) })),
    answers: words.filter((_, i) => chosen.has(i)),
  };
}

/**
 * Word tiles for the first rung: the sentence's own words, shuffled, plus a
 * couple of plausible distractors so the exercise isn't solvable by counting.
 */
export function buildTiles(target: string, distractorPool: string[], rng = Math.random): string[] {
  const words = sentenceWords(target);
  const own = new Set(words.map(looseWord));
  const distractors = distractorPool
    .filter((d) => !own.has(looseWord(d)))
    .filter((d, i, arr) => arr.findIndex((x) => looseWord(x) === looseWord(d)) === i)
    .slice(0, Math.min(3, Math.max(1, Math.floor(words.length / 3))));

  const tiles = [...words, ...distractors];
  // Fisher-Yates, seeded via the injected rng so tests are deterministic.
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  return tiles;
}
