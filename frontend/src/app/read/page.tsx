'use client';

import Link from 'next/link';
import { useRequireAuth } from '@/lib/hooks';
import { loadProgress, weekReachedFor } from '@/lib/progress';
import { getReadings } from '@/lib/readings';
import { getActiveLanguage } from '@/lib/languages';
import { ReadingListSkeleton } from '@/components/Skeleton';

export default function ReadingListPage() {
  const { isLoading } = useRequireAuth();

  if (isLoading) {
    return (
      <ReadingListSkeleton />
    );
  }

  const weekReached = weekReachedFor(loadProgress());

  return (
    <div className="min-h-screen pb-24">
      <nav className="sticky top-0 z-20 bg-paper/85 dark:bg-paper-dark/85 backdrop-blur-md border-b border-stone-200/70 dark:border-stone-800">
        <div className="max-w-2xl mx-auto px-4 lg:px-6 py-3 flex items-center justify-between">
          <Link
            href="/lessons"
            className="text-ink-soft dark:text-stone-300 hover:text-ink dark:hover:text-white font-semibold text-sm inline-flex items-center gap-1.5"
          >
            <span aria-hidden>←</span> Back to lessons
          </Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 lg:px-6 pt-8">
        <header className="mb-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400 mb-2">
            Reading
          </p>
          <h1 className="font-display text-4xl font-black text-ink dark:text-white leading-[1.05]">
            Read in {getActiveLanguage().name}
          </h1>
          <p className="text-ink-soft dark:text-stone-400 mt-2">
            Short passages, real comprehension. Tap any word you don't know instead of reading a
            full translation — figure out the rest from context.
          </p>
        </header>

        <div className="space-y-3.5">
          {getReadings().map((r) => {
            const unlocked = weekReached >= r.minWeek;
            const card = (
              <div
                className={`relative rounded-3xl p-5 transition-all duration-200 ${
                  unlocked
                    ? 'surface hover:shadow-card-hover hover:-translate-y-0.5'
                    : 'bg-paper-soft dark:bg-paper-dark-soft/60 border border-stone-200/60 dark:border-stone-800/60 opacity-55 saturate-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center text-[28px] bg-gradient-to-br ${
                      unlocked
                        ? 'from-sky-400 to-blue-600'
                        : 'from-stone-300 to-stone-400 dark:from-stone-700 dark:to-stone-800'
                    } shadow-inner ring-1 ring-black/5`}
                  >
                    {unlocked ? r.emoji : '🔒'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-ink dark:text-white text-[15px]">
                      {r.title}
                    </p>
                    <p className="text-sm text-ink-soft dark:text-stone-400 mt-0.5">
                      {unlocked ? r.blurb : `Reach week ${r.minWeek} to unlock`}
                    </p>
                  </div>
                </div>
              </div>
            );
            return unlocked ? (
              <Link key={r.slug} href={`/read/${r.slug}`} className="block">
                {card}
              </Link>
            ) : (
              <div key={r.slug}>{card}</div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
