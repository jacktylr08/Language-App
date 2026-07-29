'use client';

import Link from 'next/link';
import { Icon } from '@/components/icons/Icon';

/**
 * The conversion moment.
 *
 * Shown to a guest at the end of a lesson — not at the start, and not as a
 * wall. By this point they have a streak, a handful of words and an accuracy
 * score, so the offer is "keep this" rather than "trust me". That's a
 * fundamentally stronger ask, and it's why letting people in without an
 * account isn't generosity so much as sequencing.
 *
 * Deliberately dismissible-by-ignoring: there's no overlay and no blocked
 * button. Nagging someone who is mid-habit-formation is how you lose them.
 */
export function GuestSavePrompt({
  wordsLearned,
  streak,
  urgent = false,
}: {
  wordsLearned: number;
  streak: number;
  /** After a couple of lessons, say plainly that this device is the only copy. */
  urgent?: boolean;
}) {
  return (
    <div
      className={`surface p-5 text-left ${
        urgent ? 'border-2 border-saffron-400/60' : ''
      }`}
    >
      <p className="text-[11px] font-extrabold uppercase tracking-wide text-saffron-600 dark:text-saffron-400 mb-1.5">
        {urgent ? 'Only on this device' : 'Save your progress'}
      </p>
      <p className="font-extrabold text-ink dark:text-white leading-snug">
        {wordsLearned > 0
          ? `${wordsLearned} word${wordsLearned === 1 ? '' : 's'} and a ${streak}-day streak, so far`
          : 'Keep what you just did'}
      </p>
      <p className="text-sm text-ink-soft dark:text-stone-400 mt-1 leading-relaxed">
        {urgent
          ? 'Clear your browser and it’s gone. An account keeps it, and lets you carry on from any phone or laptop.'
          : 'Create a free account to keep this and pick up where you left off on any device.'}
      </p>
      <div className="mt-4 flex items-center gap-3">
        <Link href="/register" className="btn-primary px-5 py-2.5 text-sm">
          Save my progress
        </Link>
        <Link
          href="/login"
          className="text-sm font-bold text-ink-soft dark:text-stone-400 hover:text-ink dark:hover:text-stone-200"
        >
          I have an account
        </Link>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500">
        <Icon name="check" size={13} className="text-brand-500" />
        Free — everything you&apos;ve done so far comes with you
      </p>
    </div>
  );
}
