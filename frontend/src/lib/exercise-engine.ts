/**
 * Exercise generator — turns lesson vocabulary into an adaptive session:
 * teach a small chunk → drill it from multiple angles → next chunk → mixed
 * challenge round. Missed words are automatically re-queued.
 */

import { CurriculumLesson, VocabItem, getPriorLessons, getAllVocab, getVocabById } from './curriculum';
import { getReviewWordIds } from './progress';

export type ExerciseType =
  | 'teach' // flashcard-style introduction, no grading
  | 'mcq_es_en' // see Spanish, pick English
  | 'mcq_en_es' // see English, pick Spanish
  | 'listen_mcq' // hear Spanish, pick what you heard
  | 'listen_meaning' // hear Spanish, pick the meaning
  | 'type_es' // see English, type the Spanish
  | 'fill_blank' // complete the sentence
  | 'match_pairs' // match Spanish to English
  | 'speak'; // say the Spanish out loud

export interface Exercise {
  type: ExerciseType;
  word: VocabItem;
  /** MCQ options (for choice-based types) — includes the correct answer */
  options?: string[];
  /** For fill_blank */
  sentence?: { es: string; en: string; blank: string };
  /** For match_pairs */
  pairs?: Array<{ es: string; en: string }>;
  /** Marks re-queued exercises after a miss */
  isRetry?: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickDistractors(word: VocabItem, pool: VocabItem[], count: number): VocabItem[] {
  const others = pool.filter((w) => w.id !== word.id);
  return shuffle(others).slice(0, count);
}

function mcqEsEn(word: VocabItem, pool: VocabItem[]): Exercise {
  const distractors = pickDistractors(word, pool, 3).map((w) => w.en);
  return { type: 'mcq_es_en', word, options: shuffle([word.en, ...distractors]) };
}

function mcqEnEs(word: VocabItem, pool: VocabItem[]): Exercise {
  const distractors = pickDistractors(word, pool, 3).map((w) => w.es);
  return { type: 'mcq_en_es', word, options: shuffle([word.es, ...distractors]) };
}

function listenMcq(word: VocabItem, pool: VocabItem[]): Exercise {
  const distractors = pickDistractors(word, pool, 3).map((w) => w.es);
  return { type: 'listen_mcq', word, options: shuffle([word.es, ...distractors]) };
}

function listenMeaning(word: VocabItem, pool: VocabItem[]): Exercise {
  const distractors = pickDistractors(word, pool, 3).map((w) => w.en);
  return { type: 'listen_meaning', word, options: shuffle([word.en, ...distractors]) };
}

function typeEs(word: VocabItem): Exercise {
  return { type: 'type_es', word };
}

function speak(word: VocabItem): Exercise {
  return { type: 'speak', word };
}

function fillBlank(
  sentence: { es: string; en: string; blank: string },
  lessonVocab: VocabItem[],
  pool: VocabItem[]
): Exercise | null {
  // Anchor to the vocab word the blank tests, if we can find it
  const anchor =
    lessonVocab.find((w) => sentence.blank.toLowerCase().includes(w.es.replace(/^(el|la|yo|tú|él|ella|nosotros)\s+/i, '').toLowerCase())) ||
    lessonVocab[0];
  if (!anchor) return null;
  const distractors = pickDistractors(anchor, pool, 3).map((w) =>
    w.es.replace(/^(el|la)\s+/i, '')
  );
  return {
    type: 'fill_blank',
    word: anchor,
    sentence,
    options: shuffle([sentence.blank, ...distractors]),
  };
}

function matchPairs(words: VocabItem[]): Exercise {
  const chosen = shuffle(words).slice(0, Math.min(5, words.length));
  return {
    type: 'match_pairs',
    word: chosen[0],
    pairs: chosen.map((w) => ({ es: w.es, en: w.en })),
  };
}

/** Build the full exercise queue for a standard lesson. */
export function buildLessonSession(lesson: CurriculumLesson, speechRecognitionAvailable: boolean): Exercise[] {
  if (lesson.isReview) return buildReviewSession(lesson, speechRecognitionAvailable);

  const vocab = lesson.vocab;
  const pool = [...vocab, ...getPriorLessons(lesson.slug).flatMap((l) => l.vocab)];
  const queue: Exercise[] = [];

  // Chunk vocab into groups of 4: teach → drill → teach → drill
  const chunkSize = 4;
  const chunks: VocabItem[][] = [];
  for (let i = 0; i < vocab.length; i += chunkSize) {
    chunks.push(vocab.slice(i, i + chunkSize));
  }

  chunks.forEach((chunk) => {
    // 1. Teach each word
    chunk.forEach((w) => queue.push({ type: 'teach', word: w }));
    // 2. Immediate recognition drills (easy first)
    shuffle(chunk).forEach((w) => queue.push(mcqEsEn(w, pool)));
    // 3. Listening + production drills (sample — the challenge round and
    //    spaced review cover the rest)
    shuffle(chunk)
      .slice(0, 2)
      .forEach((w, i) => {
        if (i % 2 === 0) queue.push(listenMeaning(w, pool));
        else queue.push(mcqEnEs(w, pool));
      });
    // 4. Match the chunk together
    if (chunk.length >= 4) queue.push(matchPairs(chunk));
  });

  // Challenge round: harder production exercises on a sample of the vocab
  const challenge = shuffle(vocab).slice(0, 6);
  challenge.forEach((w, i) => {
    if (speechRecognitionAvailable && i % 3 === 2) queue.push(speak(w));
    else if (i % 2 === 0) queue.push(typeEs(w));
    else queue.push(listenMcq(w, pool));
  });

  // Sentence work
  shuffle(lesson.sentences)
    .slice(0, 4)
    .forEach((s) => {
      const ex = fillBlank(s, vocab, pool);
      if (ex) queue.push(ex);
    });

  // Final matching send-off
  if (vocab.length >= 5) queue.push(matchPairs(vocab));

  return queue;
}

/** Review lessons and the practice page: adaptive queue from weakest/due words. */
export function buildReviewSession(
  lesson: CurriculumLesson | null,
  speechRecognitionAvailable: boolean,
  size = 18
): Exercise[] {
  const all = getAllVocab();
  const { due, weak } = getReviewWordIds(size);
  const ids = [...new Set([...due, ...weak])].slice(0, size);
  let words = ids.map((id) => getVocabById(id)).filter((w): w is VocabItem => !!w);

  // Not enough tracked words yet — sample across prior lessons (or everything)
  if (words.length < 8) {
    const prior = lesson ? getPriorLessons(lesson.slug).flatMap((l) => l.vocab) : all;
    const fallbackPool = prior.length > 0 ? prior : all;
    const missing = size - words.length;
    const extras = shuffle(fallbackPool.filter((w) => !words.some((x) => x.id === w.id))).slice(0, missing);
    words = [...words, ...extras];
  }

  const pool = all;
  const queue: Exercise[] = [];
  shuffle(words).forEach((w, i) => {
    switch (i % 5) {
      case 0:
        queue.push(mcqEsEn(w, pool));
        break;
      case 1:
        queue.push(listenMeaning(w, pool));
        break;
      case 2:
        queue.push(typeEs(w));
        break;
      case 3:
        queue.push(mcqEnEs(w, pool));
        break;
      default:
        if (speechRecognitionAvailable) queue.push(speak(w));
        else queue.push(listenMcq(w, pool));
    }
  });

  // Group leftovers into a couple of matching rounds
  if (words.length >= 5) {
    queue.splice(Math.floor(queue.length / 2), 0, matchPairs(words));
    queue.push(matchPairs(shuffle(words)));
  }

  return queue;
}

/** Build a retry exercise for a missed word (a different, usually easier angle). */
export function buildRetry(missed: Exercise, pool: VocabItem[]): Exercise {
  const w = missed.word;
  let retry: Exercise;
  switch (missed.type) {
    case 'type_es':
    case 'speak':
      retry = mcqEnEs(w, pool);
      break;
    case 'listen_mcq':
    case 'listen_meaning':
      retry = mcqEsEn(w, pool);
      break;
    default:
      retry = listenMeaning(w, pool);
  }
  retry.isRetry = true;
  return retry;
}
