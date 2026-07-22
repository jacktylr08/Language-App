/**
 * Exercise generator — turns lesson vocabulary into an adaptive session:
 * teach a small chunk → drill it from multiple angles → next chunk → mixed
 * challenge round. Missed words are automatically re-queued.
 */

import {
  CurriculumLesson,
  VocabItem,
  GrammarSlide,
  ConceptCheck,
  DialogueTurn,
  SentenceBuild,
  getPriorLessons,
  getAllVocab,
  getVocabById,
} from './curriculum';
import { getReviewWordIds, getMistakeWordIds } from './progress';
import { loadProfile } from './tutor-memory';
import { tutorFlaggedVocabIds } from './learner-insights';

export type ExerciseType =
  | 'teach' // flashcard-style introduction, no grading
  | 'grammar_slide' // teacher explanation card, no grading
  | 'dialogue_slide' // conversation presented with audio, no grading
  | 'concept_check' // graded understanding question with explanation
  | 'build_sentence' // assemble a sentence from word tiles
  | 'mcq_es_en' // see Spanish, pick English
  | 'mcq_en_es' // see English, pick Spanish
  | 'listen_meaning' // hear Spanish, pick the meaning
  | 'type_es' // see English, type the Spanish
  | 'type_en' // see Spanish, type the English — true recall, the other direction
  | 'fill_blank' // complete the sentence
  | 'match_pairs' // match Spanish to English
  | 'speak' // say the Spanish out loud
  | 'write_answer'; // free composition, graded by the tutor

export interface Exercise {
  type: ExerciseType;
  word: VocabItem;
  /** MCQ options (for choice-based types) — includes the correct answer */
  options?: string[];
  /** For fill_blank */
  sentence?: { es: string; en: string; blank: string };
  /** For match_pairs */
  pairs?: Array<{ es: string; en: string }>;
  /** For grammar_slide */
  slide?: GrammarSlide;
  /** For dialogue_slide */
  dialogue?: DialogueTurn[];
  /** For concept_check */
  check?: ConceptCheck;
  /** For build_sentence */
  build?: SentenceBuild;
  /** For build_sentence: shuffled word tiles (correct words + distractors) */
  tiles?: string[];
  /** For write_answer: the free-composition prompt and words to try using */
  writingPrompt?: { instruction: string; suggested: string[] };
  /** Don't record this result against a real vocab word (synthetic anchors) */
  noWordTracking?: boolean;
  /** Marks re-queued exercises after a miss */
  isRetry?: boolean;
}

/** Synthetic anchor for exercises not tied to one vocab word */
function syntheticWord(id: string, es: string, en: string): VocabItem {
  return { id, es, en, pron: '', exampleEs: '', exampleEn: '' };
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
  // Exclude the word itself AND anything whose displayed text would collide
  // with it (or with another picked distractor) — duplicate options confuse
  // the learner and break option rendering.
  const seen = new Set([word.es.toLowerCase(), word.en.toLowerCase()]);
  const picked: VocabItem[] = [];
  for (const w of shuffle(pool)) {
    if (w.id === word.id) continue;
    const es = w.es.toLowerCase();
    const en = w.en.toLowerCase();
    if (seen.has(es) || seen.has(en)) continue;
    seen.add(es);
    seen.add(en);
    picked.push(w);
    if (picked.length === count) break;
  }
  return picked;
}

function mcqEsEn(word: VocabItem, pool: VocabItem[]): Exercise {
  const distractors = pickDistractors(word, pool, 3).map((w) => w.en);
  return { type: 'mcq_es_en', word, options: shuffle([word.en, ...distractors]) };
}

function mcqEnEs(word: VocabItem, pool: VocabItem[]): Exercise {
  const distractors = pickDistractors(word, pool, 3).map((w) => w.es);
  return { type: 'mcq_en_es', word, options: shuffle([word.es, ...distractors]) };
}

function listenMeaning(word: VocabItem, pool: VocabItem[]): Exercise {
  const distractors = pickDistractors(word, pool, 3).map((w) => w.en);
  return { type: 'listen_meaning', word, options: shuffle([word.en, ...distractors]) };
}

function typeEs(word: VocabItem): Exercise {
  return { type: 'type_es', word };
}

function typeEn(word: VocabItem): Exercise {
  return { type: 'type_en', word };
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
  const seen = new Set([sentence.blank.toLowerCase()]);
  const distractors: string[] = [];
  for (const w of pickDistractors(anchor, pool, 8)) {
    const text = w.es.replace(/^(el|la)\s+/i, '');
    if (seen.has(text.toLowerCase())) continue;
    seen.add(text.toLowerCase());
    distractors.push(text);
    if (distractors.length === 3) break;
  }
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

function conceptCheck(check: ConceptCheck, lessonSlug: string, idx: number): Exercise {
  return {
    type: 'concept_check',
    word: syntheticWord(`cc-${lessonSlug}-${idx}`, check.correct, ''),
    check,
    options: check.options,
    noWordTracking: true,
  };
}

/** Split a Spanish sentence into word tiles (punctuation stripped from tiles). */
export function sentenceTiles(es: string): string[] {
  return es
    .replace(/[¿?¡!.,;:]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

/**
 * The capstone production task: no options to pick from, no tiles to arrange
 * — just write. Nudges the learner toward a few of this lesson's own words
 * (stripped of leading articles/pronouns so they read as bare vocabulary),
 * but the prompt is deliberately open so any genuine attempt is gradeable.
 */
function writeAnswer(lesson: CurriculumLesson): Exercise {
  const suggested = shuffle(lesson.vocab)
    .slice(0, 3)
    .map((w) => w.es.replace(/^(el|la|los|las|yo|tú|él|ella|nosotros)\s+/i, ''));
  return {
    type: 'write_answer',
    word: syntheticWord(`wa-${lesson.slug}`, '', ''),
    writingPrompt: {
      instruction: 'Write 1–2 sentences in Spanish using at least two of these words.',
      suggested,
    },
    noWordTracking: true,
  };
}

function buildSentence(build: SentenceBuild, lessonSlug: string, idx: number, pool: VocabItem[]): Exercise {
  const words = sentenceTiles(build.es);
  const inSentence = new Set(words.map((w) => w.toLowerCase()));
  // Two distractor tiles sampled from single-word vocab not in the sentence
  const distractors = shuffle(
    pool
      .map((v) => v.es.replace(/^(el|la|los|las)\s+/i, ''))
      .filter((w) => !w.includes(' ') && !inSentence.has(w.toLowerCase()))
  ).slice(0, 2);
  return {
    type: 'build_sentence',
    word: syntheticWord(`bs-${lessonSlug}-${idx}`, build.es, build.en),
    build,
    tiles: shuffle([...words, ...distractors]),
    noWordTracking: true,
  };
}

/** Build the full exercise queue for a standard lesson.
 *
 * Structure mirrors a real tutoring session:
 *   explain (grammar) → check understanding → teach vocab in chunks →
 *   drill → dialogue in context → produce full sentences → challenge.
 */
export function buildLessonSession(lesson: CurriculumLesson, speechRecognitionAvailable: boolean): Exercise[] {
  if (lesson.isReview) return buildReviewSession(lesson, speechRecognitionAvailable);

  const vocab = lesson.vocab;
  const pool = [...vocab, ...getPriorLessons(lesson.slug).flatMap((l) => l.vocab)];
  const queue: Exercise[] = [];

  const slides = lesson.grammar ?? [];
  const checks = (lesson.conceptChecks ?? []).map((c, i) => conceptCheck(c, lesson.slug, i));

  // 1. Teacher explains the first concept, then immediately checks understanding
  if (slides[0]) {
    queue.push({ type: 'grammar_slide', word: vocab[0] ?? syntheticWord(`gs-${lesson.slug}`, '', ''), slide: slides[0] });
    checks.slice(0, 2).forEach((c) => queue.push(c));
  }

  // 2. Vocabulary in chunks of 4: teach → drill → teach → drill
  const chunkSize = 4;
  const chunks: VocabItem[][] = [];
  for (let i = 0; i < vocab.length; i += chunkSize) {
    chunks.push(vocab.slice(i, i + chunkSize));
  }

  chunks.forEach((chunk) => {
    chunk.forEach((w) => queue.push({ type: 'teach', word: w }));
    // One easy recognition check for half the chunk, right off the
    // introduction — a brand-new word deserves a gentle first touch before
    // real recall is fair.
    shuffle(chunk)
      .slice(0, Math.ceil(chunk.length / 2))
      .forEach((w) => queue.push(mcqEsEn(w, pool)));
    // Real recall for every word — English shown, produce the Spanish.
    // Deliberately the main event: producing the target language from memory
    // reinforces more than recognising it, and more than recalling the
    // English meaning does going the other way round.
    shuffle(chunk).forEach((w) => queue.push(typeEs(w)));
    // Meaning-recall the other direction too, for about half the chunk —
    // still worth practising, just secondary to producing Spanish.
    shuffle(chunk)
      .slice(0, Math.ceil(chunk.length / 2))
      .forEach((w) => queue.push(typeEn(w)));
    if (chunk.length >= 4) queue.push(matchPairs(chunk));
  });

  // 3. Remaining teaching: second slide + remaining concept checks
  slides.slice(1).forEach((s) => {
    queue.push({ type: 'grammar_slide', word: vocab[0] ?? syntheticWord(`gs-${lesson.slug}`, '', ''), slide: s });
  });
  checks.slice(2).forEach((c) => queue.push(c));

  // 4. Dialogue in context (listen + read, then it feeds the checks/builds)
  if (lesson.dialogue && lesson.dialogue.length > 0) {
    queue.push({
      type: 'dialogue_slide',
      word: vocab[0] ?? syntheticWord(`dl-${lesson.slug}`, '', ''),
      dialogue: lesson.dialogue,
    });
  }

  // 5. Production: build full sentences from tiles
  (lesson.builds ?? []).forEach((b, i) => {
    queue.push(buildSentence(b, lesson.slug, i, pool));
  });

  // 5b. Free composition — the real test: write your own sentence, no
  // scaffolding. One per lesson, as the capstone before the challenge round.
  if (vocab.length >= 3) queue.push(writeAnswer(lesson));

  // 6. Challenge round: harder production on a sample of the vocab — all
  // recall, no recognition, weighted toward producing Spanish over recalling
  // English (the direction that reinforces most), with speaking mixed in.
  const challenge = shuffle(vocab).slice(0, 6);
  const challengeAngles: Array<'es' | 'en' | 'speak'> = ['es', 'es', 'en', 'es', 'en', 'speak'];
  challenge.forEach((w, i) => {
    const angle = challengeAngles[i % challengeAngles.length];
    if (angle === 'speak' && speechRecognitionAvailable) queue.push(speak(w));
    else if (angle === 'en') queue.push(typeEn(w));
    else queue.push(typeEs(w));
  });

  // 7. Sentence fill-ins
  shuffle(lesson.sentences)
    .slice(0, 4)
    .forEach((s) => {
      const ex = fillBlank(s, vocab, pool);
      if (ex) queue.push(ex);
    });

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
    // Mostly recall (type it from memory, both directions) with just one
    // recognition touch in the cycle — recognising an answer among options
    // is a much weaker memory test than producing it unprompted.
    // Weighted toward producing Spanish (typeEs) over recalling English
    // (typeEn), with one recognition touch and a speaking rep in the cycle.
    switch (i % 5) {
      case 0:
      case 1:
        queue.push(typeEs(w));
        break;
      case 2:
        queue.push(mcqEsEn(w, pool));
        break;
      case 3:
        queue.push(typeEn(w));
        break;
      default:
        if (speechRecognitionAvailable) queue.push(speak(w));
        else queue.push(typeEs(w));
    }
  });

  // Group leftovers into a couple of matching rounds
  if (words.length >= 5) {
    queue.splice(Math.floor(queue.length / 2), 0, matchPairs(words));
    queue.push(matchPairs(shuffle(words)));
  }

  return queue;
}

/**
 * A session built from the words the learner has actually got wrong — both in
 * lesson/practice exercises AND things Profe has flagged in live conversation
 * (e.g. "confuses ser and estar" maps back to the actual vocab involved).
 * Tutor-flagged words come first since a named confusion is a stronger signal
 * than an exercise miss. Same mix of exercise angles as review.
 */
export function buildMistakesSession(
  speechRecognitionAvailable: boolean,
  size = 16
): Exercise[] {
  const tutorIds = tutorFlaggedVocabIds(loadProfile());
  const exerciseIds = getMistakeWordIds(size);
  const ids = Array.from(new Set([...tutorIds, ...exerciseIds])).slice(0, size);
  const words = ids.map((id) => getVocabById(id)).filter((w): w is VocabItem => !!w);
  if (words.length === 0) return [];

  const pool = getAllVocab();
  const queue: Exercise[] = [];
  shuffle(words).forEach((w, i) => {
    // Mostly recall (type it from memory, both directions) with just one
    // recognition touch in the cycle — recognising an answer among options
    // is a much weaker memory test than producing it unprompted.
    // Weighted toward producing Spanish (typeEs) over recalling English
    // (typeEn), with one recognition touch and a speaking rep in the cycle.
    switch (i % 5) {
      case 0:
      case 1:
        queue.push(typeEs(w));
        break;
      case 2:
        queue.push(mcqEsEn(w, pool));
        break;
      case 3:
        queue.push(typeEn(w));
        break;
      default:
        if (speechRecognitionAvailable) queue.push(speak(w));
        else queue.push(typeEs(w));
    }
  });
  if (words.length >= 5) queue.push(matchPairs(words));
  return queue;
}

/** Build a retry exercise for a missed word (a different, usually easier angle). */
export function buildRetry(missed: Exercise, pool: VocabItem[]): Exercise {
  const w = missed.word;
  let retry: Exercise;
  switch (missed.type) {
    // Understanding/production exercises come back as themselves — the point
    // is to apply the explanation you just read.
    case 'concept_check':
    case 'build_sentence':
      retry = { ...missed, tiles: missed.tiles ? shuffle(missed.tiles) : undefined };
      break;
    // Same prompt again — the point is to have another go with the tutor's
    // corrected version fresh in mind, not to test a different word.
    case 'write_answer':
      retry = { ...missed };
      break;
    case 'type_es':
    case 'speak':
      retry = mcqEnEs(w, pool);
      break;
    case 'type_en':
      retry = mcqEsEn(w, pool);
      break;
    case 'listen_meaning':
      retry = mcqEsEn(w, pool);
      break;
    default:
      retry = listenMeaning(w, pool);
  }
  retry.isRetry = true;
  return retry;
}
