'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/lib/hooks';
import { curriculum } from '@/lib/curriculum';
import {
  loadProgress,
  currentStreak,
  todaysXp,
  knownWordCount,
  lessonStars,
  ProgressState,
} from '@/lib/progress';

const themeAccents: Record<string, string> = {
  phonetics: 'from-slate-400 to-slate-500',
  verbs: 'from-violet-400 to-purple-600',
  family: 'from-rose-400 to-red-500',
  nouns: 'from-sky-400 to-blue-600',
  adjectives: 'from-cyan-400 to-teal-500',
  review: 'from-amber-400 to-orange-500',
};

export default function LessonsPage() {
  const { user, isLoading: authLoading } = useRequireAuth();
  const [progress, setProgress] = useState<ProgressState | null>(null);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  if (authLoading || !progress) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    );
  }

  const streak = currentStreak(progress);
  const xpToday = todaysXp(progress);
  const goalPct = Math.min(100, Math.round((xpToday / progress.dailyGoal) * 100));
  const wordsKnown = knownWordCount(progress);
  const lessonsDone = curriculum.filter((l) => progress.lessons[l.slug]?.completed).length;

  // A lesson unlocks when the previous one is completed
  const isUnlocked = (index: number): boolean => {
    if (index === 0) return true;
    return !!progress.lessons[curriculum[index - 1].slug]?.completed;
  };
  const currentIndex = curriculum.findIndex(
    (l, i) => isUnlocked(i) && !progress.lessons[l.slug]?.completed
  );

  const weeks = Array.from(new Set(curriculum.map((l) => l.week))).sort((a, b) => a - b);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24">
      {/* Sticky header with stats */}
      <nav className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-extrabold text-emerald-500">
            Aprende
          </Link>
          <div className="flex items-center gap-4 text-sm font-extrabold">
            <span className={`flex items-center gap-1 ${streak > 0 ? 'text-orange-500' : 'text-slate-400'}`} title="Day streak">
              🔥 {streak}
            </span>
            <span className="flex items-center gap-1 text-amber-500" title="Total XP">
              ⚡ {progress.xp}
            </span>
            <button
              onClick={() => {
                localStorage.removeItem('language-app-auth');
                window.location.href = '/login';
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 pt-6">
        {/* Daily goal + stats */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 mb-6 shadow-sm">
          <div className="flex items-center gap-4">
            {/* Goal ring */}
            <div className="relative w-16 h-16 shrink-0">
              <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="4" className="stroke-slate-200 dark:stroke-slate-700" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  strokeWidth="4"
                  strokeLinecap="round"
                  className="stroke-emerald-500 transition-all duration-700"
                  strokeDasharray={`${(goalPct / 100) * 97.4} 97.4`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-lg">
                {goalPct >= 100 ? '🎉' : '🎯'}
              </span>
            </div>
            <div className="flex-1">
              <p className="font-extrabold text-slate-900 dark:text-white">
                {goalPct >= 100 ? 'Daily goal smashed!' : 'Daily goal'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {xpToday} / {progress.dailyGoal} XP today
              </p>
            </div>
            <div className="text-right">
              <p className="font-extrabold text-slate-900 dark:text-white">{wordsKnown}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">words known</p>
            </div>
          </div>
        </div>

        {/* Smart practice card */}
        {lessonsDone > 0 && (
          <Link
            href="/practice"
            className="block bg-gradient-to-r from-sky-500 to-indigo-500 rounded-3xl p-5 mb-8 shadow-lg shadow-sky-500/20 hover:shadow-xl transition-all active:scale-[0.99] group"
          >
            <div className="flex items-center gap-4">
              <span className="text-4xl">🧠</span>
              <div className="flex-1">
                <p className="font-extrabold text-white text-lg">Smart Practice</p>
                <p className="text-sky-100 text-sm">
                  Review the words you&apos;re about to forget — personalised to you
                </p>
              </div>
              <span className="text-white text-2xl group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </Link>
        )}

        {/* Learning path */}
        {weeks.map((week) => (
          <section key={week} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-sm font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Week {week}
              </h2>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            </div>

            <div className="space-y-4">
              {curriculum
                .filter((l) => l.week === week)
                .map((lesson) => {
                  const index = curriculum.findIndex((c) => c.slug === lesson.slug);
                  const record = progress.lessons[lesson.slug];
                  const unlocked = isUnlocked(index);
                  const isCurrent = index === currentIndex;
                  const stars = lessonStars(record);
                  const accent = themeAccents[lesson.theme] || themeAccents.phonetics;

                  const card = (
                    <div
                      className={`relative rounded-3xl border-2 p-5 transition-all ${
                        !unlocked
                          ? 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 opacity-60'
                          : isCurrent
                            ? 'bg-white dark:bg-slate-800 border-emerald-400 dark:border-emerald-500 shadow-lg shadow-emerald-500/10 animate-glow-pulse'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500 hover:shadow-md active:scale-[0.99]'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center text-3xl bg-gradient-to-br ${
                            unlocked ? accent : 'from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700'
                          }`}
                        >
                          {unlocked ? lesson.emoji : '🔒'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-extrabold text-slate-900 dark:text-white truncate">
                            {lesson.title}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                            {lesson.subtitle}
                          </p>
                          {record?.completed && (
                            <p className="text-amber-400 text-sm mt-0.5" aria-label={`${stars} stars`}>
                              {'★'.repeat(stars)}
                              <span className="text-slate-300 dark:text-slate-600">
                                {'★'.repeat(3 - stars)}
                              </span>
                              <span className="text-xs text-slate-400 dark:text-slate-500 ml-2">
                                best {record.bestAccuracy}%
                              </span>
                            </p>
                          )}
                        </div>
                        {unlocked && (
                          <span
                            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-extrabold ${
                              isCurrent
                                ? 'bg-emerald-500 text-white'
                                : record?.completed
                                  ? 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                            }`}
                          >
                            {isCurrent ? 'START' : record?.completed ? 'REDO' : 'START'}
                          </span>
                        )}
                      </div>
                    </div>
                  );

                  return unlocked ? (
                    <Link key={lesson.slug} href={`/lessons/${lesson.slug}`} className="block">
                      {card}
                    </Link>
                  ) : (
                    <div key={lesson.slug} title="Complete the previous lesson to unlock">
                      {card}
                    </div>
                  );
                })}
            </div>
          </section>
        ))}

        <p className="text-center text-xs text-slate-400 dark:text-slate-600 mt-10">
          Phase 2 (Core Vocabulary — 2,000 words) unlocks when you finish Phase 1
        </p>
      </main>
    </div>
  );
}
