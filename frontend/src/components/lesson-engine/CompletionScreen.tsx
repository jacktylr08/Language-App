'use client';

import { useEffect, useState } from 'react';
import { Confetti } from '@/components/Confetti';
import { Profe } from '@/components/Profe';
import { Icon } from '@/components/icons/Icon';
import { StatCard } from './StatCard';
import type { SessionStats } from './useLessonSession';

/**
 * The end of a lesson.
 *
 * This used to be a single bouncing emoji over two stat cards. Eleven minutes
 * of work, and no sense that anything had happened. Finishing needs to be the
 * one moment in the app that feels like an occasion — it's the payoff the
 * whole session is spending against, and it's what a learner is deciding
 * about when they choose whether to come back tomorrow.
 *
 * So it's staged rather than rendered all at once: Profe reacts, the headline
 * lands, then the numbers, then the streak, then the button. Each beat is
 * roughly a heartbeat apart. The sequence is the point — everything appearing
 * simultaneously reads as a page, and a page can't feel like a reward.
 */

interface CompletionScreenProps {
  accuracy: number;
  stats: SessionStats;
  streak: number;
  /** Lesson title, or null for a practice/mistakes session. */
  title: string | null;
  mode: 'lesson' | 'practice' | 'mistakes';
  onContinue: () => void;
}

/** Reveals its children once `at` milliseconds have passed. */
function Beat({ at, children }: { at: number; children: React.ReactNode }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), at);
    return () => clearTimeout(t);
  }, [at]);
  return (
    <div
      className={`transition-all duration-500 ${
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      }`}
    >
      {children}
    </div>
  );
}

export function CompletionScreen({
  accuracy,
  stats,
  streak,
  title,
  mode,
  onContinue,
}: CompletionScreenProps) {
  // A near-perfect run and a scrape-through should not be congratulated
  // identically — the praise has to mean something or it stops landing.
  const tier = accuracy >= 95 ? 'perfect' : accuracy >= 80 ? 'good' : 'solid';

  const headline = { perfect: '¡Perfecto!', good: '¡Muy bien!', solid: '¡Bien hecho!' }[tier];
  const fromProfe = {
    perfect: 'Not a single slip. That was genuinely excellent.',
    good: "Strong work — you've got the shape of this now.",
    solid: 'You finished it, and the hard ones are the ones that stick.',
  }[tier];

  return (
    <div className="min-h-screen bg-paper dark:bg-paper-dark flex items-center justify-center px-6 py-10">
      {/* Only for a genuinely good run. Confetti for everything is confetti
          for nothing. */}
      {tier !== 'solid' && <Confetti />}

      <div className="max-w-md w-full text-center">
        <Beat at={0}>
          <Profe mood="happy" size={132} className="mx-auto animate-pop" />
        </Beat>

        <Beat at={250}>
          <h1 className="font-display text-5xl font-black text-ink dark:text-white mt-2 mb-2">
            {headline}
          </h1>
          <p className="text-ink-soft dark:text-stone-400 mb-1">
            {mode === 'practice'
              ? 'Practice session complete'
              : mode === 'mistakes'
              ? 'Mistakes cleared'
              : `${title} complete`}
          </p>
        </Beat>

        <Beat at={500}>
          <p className="text-[15px] text-ink-soft dark:text-stone-400 italic mb-7 px-4">
            &ldquo;{fromProfe}&rdquo;
          </p>
        </Beat>

        <Beat at={750}>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <StatCard label="Accuracy" value={`${accuracy}%`} color="text-brand-500" delay="0ms" />
            <StatCard
              label="Best combo"
              value={`${stats.bestCombo}x`}
              color="text-terra-500"
              delay="120ms"
            />
          </div>
        </Beat>

        <Beat at={1050}>
          <div className="surface p-4 mb-7 flex items-center justify-center gap-3">
            <Icon name="flame" size={30} className="text-terra-500" />
            <div className="text-left">
              <p className="font-extrabold text-stone-900 dark:text-white text-lg">
                {streak} day{streak === 1 ? '' : 's'} in a row
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Come back tomorrow to keep it alive
              </p>
            </div>
          </div>
        </Beat>

        <Beat at={1300}>
          <button onClick={onContinue} className="btn-primary w-full py-4 text-lg">
            Continue
          </button>
        </Beat>
      </div>
    </div>
  );
}
