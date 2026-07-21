/**
 * Turns lesson performance into things the tutor should know about the learner —
 * which words they struggle with, which they've nailed, which they mispronounce,
 * and what was recently covered. This is what lets each lesson quietly *teach the
 * tutor about the user*, so the live conversation targets real weak spots instead
 * of generic phrases.
 *
 * All derived from the same synced progress store — no extra storage needed.
 */
import { curriculum } from './curriculum';
import { loadProgress } from './progress';

const vocabMeta = new Map<string, { es: string; en: string }>();
for (const lesson of curriculum) {
  for (const v of lesson.vocab) vocabMeta.set(v.id, { es: v.es, en: v.en });
}

export interface LessonInsights {
  /** Words they keep getting wrong: "word (english)". */
  strugglingVocab: string[];
  /** Words they've clearly nailed. */
  strongVocab: string[];
  /** Words whose pronunciation trips them up: `pronouncing "word"`. */
  pronunciationTrouble: string[];
  /** Titles of the lessons they most recently completed. */
  coveredRecently: string[];
}

export function buildLessonInsights(): LessonInsights {
  const p = loadProgress();

  const struggling: Array<{ label: string; score: number }> = [];
  const strong: string[] = [];
  const pron: string[] = [];

  for (const [id, w] of Object.entries(p.words)) {
    const meta = vocabMeta.get(id);
    if (!meta) continue;
    const label = `${meta.es} (${meta.en})`;

    const attempts = w.correct + w.wrong;
    if (attempts >= 2) {
      const acc = w.correct / attempts;
      if (acc < 0.6 || w.strength <= 1) struggling.push({ label, score: w.wrong - w.correct });
      else if (w.strength >= 4 && w.wrong === 0) strong.push(label);
    }

    const pronAttempts = (w.pronCorrect || 0) + (w.pronWrong || 0);
    if (pronAttempts >= 1 && (w.pronWrong || 0) > (w.pronCorrect || 0)) {
      pron.push(`pronouncing "${meta.es}"`);
    }
  }

  struggling.sort((a, b) => b.score - a.score);

  const coveredRecently = Object.entries(p.lessons)
    .filter(([, r]) => r.completed && r.lastCompleted)
    .sort((a, b) => (b[1].lastCompleted || '').localeCompare(a[1].lastCompleted || ''))
    .map(([slug]) => curriculum.find((l) => l.slug === slug)?.title)
    .filter((t): t is string => !!t)
    .slice(0, 3);

  return {
    strugglingVocab: struggling.map((s) => s.label).slice(0, 12),
    strongVocab: strong.slice(0, 12),
    pronunciationTrouble: pron.slice(0, 8),
    coveredRecently,
  };
}
