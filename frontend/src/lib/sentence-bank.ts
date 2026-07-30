/**
 * Every sentence in the course, indexed by the lesson that taught it.
 *
 * The gap this exists to close: knowing words and being able to say something
 * are different skills, and the app only ever trained the first. Every graded
 * exercise handed the learner the answer in some form — pick it from four
 * options, type a single word, drag tiles that are already the right words.
 * None of that is composition. The moment you want to say a real sentence
 * from nothing, none of it has prepared you.
 *
 * Nothing new is authored here. The course already contains 700+ hand-written,
 * level-appropriate sentences, spread across three fields that each existed
 * for a different single purpose:
 *   - `builds`    — tile-assembly sentences
 *   - `sentences` — fill-in-the-blank carriers
 *   - `dialogue`  — lines of real conversation
 * All three are the same underlying thing: a correct Spanish sentence with an
 * English meaning, written by someone who knew exactly what the learner had
 * been taught by that point in the course. That last part is what makes them
 * usable as production targets, and it's not a property anything generated
 * could be trusted to have.
 */

import { getCurriculum, type CurriculumLesson } from './curriculum';
import { getActiveLanguageId } from './languages';

/** Where a sentence came from — kept because it changes how it should be used. */
export type SentenceSource = 'build' | 'blank' | 'dialogue';

export interface BankSentence {
  /** Stable across sessions and rebuilds — see sentenceId. */
  id: string;
  es: string;
  en: string;
  /** The lesson that authored it. This is the unit of scope. */
  slug: string;
  week: number;
  source: SentenceSource;
  /** Speaker name for a dialogue line, so it can be shown in context. */
  speaker?: string;
  /** Word count, cached — drives difficulty ordering and tile layout. */
  words: number;
}

/**
 * A stable id for a sentence.
 *
 * Deliberately derived from the lesson slug and the Spanish text rather than
 * an array index: indices shift the moment anyone inserts a sentence into the
 * middle of a lesson, and every learner's per-sentence progress would silently
 * re-point at a different sentence. Hashing the text means editing a sentence
 * resets just that one (correct — it's a different sentence now), and
 * reordering resets nothing.
 */
export function sentenceId(slug: string, es: string): string {
  let h = 5381;
  const key = `${slug}|${es}`;
  for (let i = 0; i < key.length; i++) h = ((h << 5) + h + key.charCodeAt(i)) | 0;
  return `${slug}:${(h >>> 0).toString(36)}`;
}

/** Words in a sentence, punctuation stripped — the tile set, and the length measure. */
export function sentenceWords(es: string): string[] {
  return es
    .replace(/[¿?¡!.,;:"]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function harvestLesson(lesson: CurriculumLesson): BankSentence[] {
  const out: BankSentence[] = [];
  const seen = new Set<string>();

  const add = (es: string, en: string, source: SentenceSource, speaker?: string): void => {
    const text = es.trim();
    const meaning = en.trim();
    // A sentence needs a meaning to be a production target — you can't ask
    // someone to say something without telling them what to say.
    if (!text || !meaning) return;
    const words = sentenceWords(text);
    // One-word "sentences" are vocabulary, which the app already drills to
    // death. The whole point here is assembling more than one word.
    if (words.length < 2) return;
    // The same line often appears in more than one field of a lesson.
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      id: sentenceId(lesson.slug, text),
      es: text,
      en: meaning,
      slug: lesson.slug,
      week: lesson.week,
      source,
      speaker,
      words: words.length,
    });
  };

  for (const b of lesson.builds ?? []) add(b.es, b.en, 'build');
  for (const s of lesson.sentences ?? []) add(s.es, s.en, 'blank');
  for (const d of lesson.dialogue ?? []) add(d.es, d.en, 'dialogue', d.speaker);

  return out;
}

// Rebuilt only when the active language actually changes — the curriculum is
// a large static array and re-harvesting it on every render would be wasteful.
let cachedLanguageId: string | null = null;
let cachedBank: BankSentence[] = [];
let cachedBySlug: Map<string, BankSentence[]> = new Map();

function ensureBank(): void {
  const id = getActiveLanguageId();
  if (id === cachedLanguageId) return;
  cachedLanguageId = id;
  cachedBank = [];
  cachedBySlug = new Map();
  for (const lesson of getCurriculum()) {
    const harvested = harvestLesson(lesson);
    cachedBySlug.set(lesson.slug, harvested);
    cachedBank.push(...harvested);
  }
}

/** Every sentence in the course, in curriculum order. */
export function getSentenceBank(): BankSentence[] {
  ensureBank();
  return cachedBank;
}

/** The sentences a single lesson authored. */
export function sentencesForLesson(slug: string): BankSentence[] {
  ensureBank();
  return cachedBySlug.get(slug) ?? [];
}

/** Lookup by id — used to resurrect a saved in-progress session. */
export function getSentenceById(id: string): BankSentence | undefined {
  ensureBank();
  return cachedBank.find((s) => s.id === id);
}
