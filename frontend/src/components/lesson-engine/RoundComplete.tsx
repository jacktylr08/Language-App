'use client';

import { Profe } from '@/components/Profe';
import { Icon } from '@/components/icons/Icon';
import type { SessionStats } from './useLessonSession';

/**
 * The end of a round — a real place to stop.
 *
 * This is the whole point of splitting lessons up. A lesson is fifty-odd
 * exercises and about eleven minutes, and the length was never really the
 * problem: the absence of a finish line inside it was. Someone with four
 * spare minutes couldn't start an eleven-minute thing, so on a busy day they
 * didn't open the app, and that's how the habit dies.
 *
 * So "Stop here" is given equal weight to "Keep going" — not buried, not
 * guilt-tripped. The round is already banked by the time this renders, so
 * stopping genuinely costs nothing, and saying so plainly is what makes the
 * offer believable. An app that punishes you for leaving teaches you to dread
 * opening it.
 */
export function RoundComplete({
  roundNumber,
  roundsTotal,
  stats,
  onContinue,
  onStop,
}: {
  roundNumber: number;
  roundsTotal: number;
  stats: SessionStats;
  onContinue: () => void;
  onStop: () => void;
}) {
  const accuracy =
    stats.answered > 0 ? Math.round((stats.firstTryCorrect / stats.answered) * 100) : 100;
  const remaining = roundsTotal - roundNumber;

  return (
    <div className="min-h-[100dvh] bg-paper dark:bg-paper-dark flex items-center justify-center px-6 py-10">
      <div className="max-w-sm w-full text-center animate-rise-in">
        <Profe mood="happy" size={104} className="mx-auto mb-3" />

        <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">
          Round {roundNumber} of {roundsTotal}
        </p>
        <h1 className="font-display text-4xl font-black text-ink dark:text-white mt-1 mb-2">
          Banked.
        </h1>
        <p className="text-ink-soft dark:text-stone-400 leading-relaxed mb-6">
          {remaining === 0
            ? 'That was the last round — finish up to complete the lesson.'
            : `Saved. You can stop here and pick up at round ${roundNumber + 1} whenever.`}
        </p>

        {/* Round pips: what's done, what's left, at a glance. */}
        <div className="flex items-center justify-center gap-1.5 mb-6" aria-hidden>
          {Array.from({ length: roundsTotal }).map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all ${
                i < roundNumber ? 'w-7 bg-brand-500' : 'w-2 bg-stone-200 dark:bg-stone-800'
              }`}
            />
          ))}
        </div>

        <div className="surface p-4 mb-7 flex items-center justify-center gap-6">
          <div>
            <p className="font-display text-2xl font-black text-brand-600 dark:text-brand-400 leading-none">
              {accuracy}%
            </p>
            <p className="text-xs text-ink-soft dark:text-stone-400 mt-1">so far</p>
          </div>
          <div className="w-px self-stretch bg-stone-200 dark:bg-stone-800" />
          <div>
            <p className="font-display text-2xl font-black text-terra-500 leading-none">
              {stats.answered}
            </p>
            <p className="text-xs text-ink-soft dark:text-stone-400 mt-1">answered</p>
          </div>
        </div>

        <button onClick={onContinue} className="btn-primary w-full py-4 text-lg">
          {remaining === 0 ? 'Finish the lesson' : 'Keep going'}
          {remaining > 0 && (
            <span className="ml-2 opacity-70 font-bold text-base">~3 min</span>
          )}
        </button>
        <button
          onClick={onStop}
          className="mt-2 w-full py-3.5 inline-flex items-center justify-center gap-2 font-bold text-ink-soft dark:text-stone-400 hover:text-ink dark:hover:text-stone-200 transition-colors"
        >
          <Icon name="check" size={17} className="text-brand-500" />
          Stop here — it&apos;s saved
        </button>
      </div>
    </div>
  );
}
