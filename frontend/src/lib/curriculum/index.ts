/**
 * Curriculum registry — one module per course language. Only Spanish exists
 * today; adding a new language means adding its own file here (e.g. fr.ts)
 * and registering it below. Every existing consumer imports from
 * '@/lib/curriculum' exactly as before (curriculum, phaseForWeek,
 * getAllVocab, ...) — those keep resolving to the active language's data,
 * so this refactor changes no call site outside this directory.
 */
import * as es from './es';
import * as it from './it';
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

const REGISTRY: Record<string, CurriculumModule> = { es, it };

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

// Re-resolved from activeModule() on every call rather than bound once at
// import time — with only one language registered today these are
// indistinguishable, but a frozen binding would silently keep serving the
// PREVIOUS language's data forever after a future language switch, since ES
// module top-level code only runs once. getCurriculum() is a function (a
// small, bounded set of call sites already treat it as one, updated
// alongside this fix) rather than a plain array for the same reason — a
// plain array binding has this exact bug and can't be fixed without
// becoming a function.
export function getCurriculum(): CurriculumModule['curriculum'] {
  return activeModule().curriculum;
}
export function getLessonBySlug(slug: string): ReturnType<CurriculumModule['getLessonBySlug']> {
  return activeModule().getLessonBySlug(slug);
}
export function phaseForWeek(week: number): ReturnType<CurriculumModule['phaseForWeek']> {
  return activeModule().phaseForWeek(week);
}
export function getAllVocab(): ReturnType<CurriculumModule['getAllVocab']> {
  return activeModule().getAllVocab();
}
export function getVocabById(id: string): ReturnType<CurriculumModule['getVocabById']> {
  return activeModule().getVocabById(id);
}
export function getPriorLessons(
  ...args: Parameters<CurriculumModule['getPriorLessons']>
): ReturnType<CurriculumModule['getPriorLessons']> {
  return activeModule().getPriorLessons(...args);
}
