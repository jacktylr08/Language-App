/**
 * Curriculum registry — one module per course language. Only Spanish exists
 * today; adding a new language means adding its own file here (e.g. fr.ts)
 * and registering it below. Every existing consumer imports from
 * '@/lib/curriculum' exactly as before (curriculum, phaseForWeek,
 * getAllVocab, ...) — those keep resolving to the active language's data,
 * so this refactor changes no call site outside this directory.
 */
import * as es from './es';
import { getActiveLanguageId } from '../languages';

export type {
  VocabItem,
  GrammarSlide,
  ConceptCheck,
  DialogueTurn,
  SentenceBuild,
  CurriculumLesson,
} from './es';

interface CurriculumModule {
  curriculum: (typeof es)['curriculum'];
  getLessonBySlug: (typeof es)['getLessonBySlug'];
  phaseForWeek: (typeof es)['phaseForWeek'];
  getAllVocab: (typeof es)['getAllVocab'];
  getVocabById: (typeof es)['getVocabById'];
  getPriorLessons: (typeof es)['getPriorLessons'];
}

const REGISTRY: Record<string, CurriculumModule> = { es };

/** Every language with curriculum content actually registered. */
export function getRegisteredCurriculumLanguages(): string[] {
  return Object.keys(REGISTRY);
}

function activeModule(): CurriculumModule {
  return REGISTRY[getActiveLanguageId()] ?? es;
}

/** The active language's full curriculum — for a specific language id, not just the active one. */
export function getCurriculumFor(languageId: string): CurriculumModule['curriculum'] {
  return (REGISTRY[languageId] ?? es).curriculum;
}

// Re-exported as plain values/functions (not language-parameterized) for
// every existing call site — there's only ever one active language per
// session today, resolved once here, same as before this refactor.
export const curriculum = activeModule().curriculum;
export const getLessonBySlug = activeModule().getLessonBySlug;
export const phaseForWeek = activeModule().phaseForWeek;
export const getAllVocab = activeModule().getAllVocab;
export const getVocabById = activeModule().getVocabById;
export const getPriorLessons = activeModule().getPriorLessons;
