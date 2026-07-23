import type { PronunciationResult } from '@/lib/pronunciation';

/**
 * Azure already returns per-word accuracy + error type — previously this was
 * collapsed into a single "Pronunciation: NN%" line. This surfaces the same
 * per-word breakdown ELSA Speak is built around: which word was the problem,
 * and roughly what kind of problem (dropped, mispronounced, inserted).
 */
const ERROR_LABEL: Record<string, string> = {
  Omission: 'dropped',
  Insertion: 'extra',
  Mispronunciation: 'mispronounced',
  UnexpectedBreak: 'paused',
  MissingBreak: 'rushed',
  Monotone: 'flat',
};

function band(score: number): { text: string; bg: string; border: string } {
  if (score >= 80) return { text: 'text-brand-600 dark:text-brand-400', bg: 'bg-brand-500/10', border: 'border-brand-500/25' };
  if (score >= 60) return { text: 'text-saffron-600 dark:text-saffron-400', bg: 'bg-saffron-400/10', border: 'border-saffron-400/25' };
  return { text: 'text-terra-600 dark:text-terra-400', bg: 'bg-terra-500/10', border: 'border-terra-500/25' };
}

export function PronunciationScoreCard({ result }: { result: PronunciationResult }) {
  return (
    <div className="mt-2 w-full max-w-xs rounded-2xl border border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-paper-dark/60 p-3.5">
      <div className="flex flex-wrap justify-center gap-1.5 mb-2.5" role="list" aria-label="Per-word pronunciation accuracy">
        {result.words.map((w, i) => {
          const c = band(w.accuracyScore);
          const flagged = w.errorType && w.errorType !== 'None';
          const label = flagged ? ERROR_LABEL[w.errorType] || w.errorType.toLowerCase() : undefined;
          return (
            <span
              key={i}
              role="listitem"
              className={`px-2 py-1 rounded-lg border text-sm font-bold ${c.text} ${c.bg} ${c.border}`}
              title={`${w.word}: ${Math.round(w.accuracyScore)}% accuracy${label ? ` — ${label}` : ''}`}
            >
              {w.word}
              {label && <span className="ml-1 text-[10px] font-semibold opacity-70 uppercase">{label}</span>}
            </span>
          );
        })}
      </div>
      <div className="flex justify-center gap-4 text-xs text-stone-500 dark:text-stone-400">
        <span>Accuracy {Math.round(result.accuracyScore)}%</span>
        <span>Fluency {Math.round(result.fluencyScore)}%</span>
        <span>Completeness {Math.round(result.completenessScore)}%</span>
      </div>
    </div>
  );
}
