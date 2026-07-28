'use client';

import { useEffect, useState } from 'react';
import { getAbilities, type Ability } from '@/lib/abilities';
import { Icon } from '@/components/icons/Icon';

/**
 * "What you can do in Spanish" — progress measured as real, practical abilities
 * rather than XP or streaks. Shows what the learner can already do, what
 * they're working on now, and a peek at what's next.
 */
export function AbilitiesPanel() {
  const [abilities, setAbilities] = useState<Ability[] | null>(null);

  useEffect(() => {
    const refresh = () => setAbilities(getAbilities());
    refresh();
    // Re-read when cross-device sync merges in new progress.
    window.addEventListener('aprende-sync', refresh);
    return () => window.removeEventListener('aprende-sync', refresh);
  }, []);

  if (!abilities) return null;

  const canDo = abilities.filter((a) => a.status === 'can-do');
  const learning = abilities.filter((a) => a.status === 'learning');
  const next = abilities.find((a) => a.status === 'locked');

  return (
    <div className="surface p-5">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="font-extrabold text-ink dark:text-white">What you can do</h2>
        <span className="text-sm font-bold text-brand-600 dark:text-brand-400">
          {canDo.length} {canDo.length === 1 ? 'skill' : 'skills'}
        </span>
      </div>
      <p className="text-xs text-ink-soft dark:text-stone-400 mb-4">
        Real things you can say and do in Spanish.
      </p>

      <ul className="space-y-2.5">
        {canDo.map((a) => (
          <li key={a.week} className="flex gap-2.5">
            <Icon name="check" size={17} className="shrink-0 mt-0.5 text-brand-500" />
            <span className="text-sm text-ink dark:text-stone-100 leading-snug">{a.statement}</span>
          </li>
        ))}

        {learning.map((a) => (
          <li key={a.week} className="flex gap-2.5">
            <Icon name="target" size={17} className="shrink-0 mt-0.5 text-saffron-500" />
            <span className="text-sm leading-snug">
              <span className="text-ink dark:text-stone-100">{a.statement}</span>
              <span className="ml-1.5 text-[11px] font-bold uppercase tracking-wide text-saffron-600 dark:text-saffron-400">
                now
              </span>
            </span>
          </li>
        ))}

        {next && (
          <li className="flex gap-2.5 opacity-50">
            <Icon name="lock" size={16} className="shrink-0 mt-1 text-stone-400 dark:text-stone-600" />
            <span className="text-sm leading-snug text-ink-soft dark:text-stone-400">
              {next.statement}
              <span className="ml-1.5 text-[11px] font-semibold uppercase tracking-wide">next</span>
            </span>
          </li>
        )}
      </ul>

      {canDo.length === 0 && learning.length > 0 && (
        <p className="text-xs text-ink-soft dark:text-stone-400 mt-3">
          Finish this week to unlock your first ability. ¡Tú puedes!
        </p>
      )}
    </div>
  );
}
