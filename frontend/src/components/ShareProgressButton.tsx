'use client';

import { useState } from 'react';
import { Icon } from '@/components/icons/Icon';
import { shareProgress, type ShareStats } from '@/lib/share-card';
import { feedback } from '@/lib/feedback';

/**
 * Offers the progress card.
 *
 * Deliberately not shown to someone on day one with nothing to show — a share
 * button next to a zero is an invitation to be embarrassed, and it teaches the
 * learner that the button isn't worth pressing. It appears once there's
 * genuinely something worth showing.
 */
export function ShareProgressButton({
  stats,
  className = '',
}: {
  stats: ShareStats;
  className?: string;
}) {
  const [state, setState] = useState<'idle' | 'working' | 'shared' | 'downloaded' | 'failed'>(
    'idle'
  );

  // Nothing to be proud of yet, so don't ask.
  if (stats.streak < 2 && stats.wordsKnown < 10) return null;

  const label = {
    idle: 'Share your progress',
    working: 'Making your card…',
    shared: 'Shared',
    downloaded: 'Saved to your device',
    failed: 'Could not make the card',
  }[state];

  return (
    <button
      onClick={async () => {
        setState('working');
        try {
          const outcome = await shareProgress(stats);
          setState(outcome === 'unavailable' ? 'failed' : outcome);
          if (outcome !== 'unavailable') feedback('streak');
        } catch {
          setState('failed');
        }
        // Back to idle so it can be pressed again — a button stuck on
        // "Shared" looks broken the second time you want it.
        setTimeout(() => setState('idle'), 2600);
      }}
      disabled={state === 'working'}
      className={`inline-flex items-center justify-center gap-2 font-bold transition-colors ${className}`}
    >
      <Icon name={state === 'shared' || state === 'downloaded' ? 'check' : 'sparkle'} size={17} />
      {label}
    </button>
  );
}
