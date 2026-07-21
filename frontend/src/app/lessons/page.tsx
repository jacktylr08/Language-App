'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/lib/hooks';
import { curriculum, phaseForWeek } from '@/lib/curriculum';
import {
  loadProgress,
  currentStreak,
  todaysXp,
  knownWordCount,
  masteredWordCount,
  lessonStars,
  ProgressState,
} from '@/lib/progress';

const themeAccents: Record<string, string> = {
  phonetics: 'from-stone-400 to-stone-600',
  verbs: 'from-violet-400 to-purple-600',
  family: 'from-rose-400 to-red-500',
  nouns: 'from-sky-400 to-blue-600',
  adjectives: 'from-cyan-400 to-teal-500',
  review: 'from-saffron-400 to-terra-500',
  grammar: 'from-indigo-400 to-indigo-600',
  conversation: 'from-pink-400 to-rose-500',
};

export default function LessonsPage() {
  const { user, isLoading: authLoading } = useRequireAuth();
  const [progress, setProgress] = useState<ProgressState | null>(null);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  if (authLoading || !progress) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500" />
      </div>
    );
  }

  const streak = currentStreak(progress);
  const xpToday = todaysXp(progress);
  const goalPct = Math.min(100, Math.round((xpToday / progress.dailyGoal) * 100));
  const wordsKnown = knownWordCount(progress);
  const wordsMastered = masteredWordCount(progress);
  const lessonsDone = curriculum.filter((l) => progress.lessons[l.slug]?.completed).length;
  const coursePct = Math.round((lessonsDone / curriculum.length) * 100);

  // A lesson unlocks when the previous one is completed
  const isUnlocked = (index: number): boolean => {
    if (index === 0) return true;
    return !!progress.lessons[curriculum[index - 1].slug]?.completed;
  };
  const currentIndex = curriculum.findIndex(
    (l, i) => isUnlocked(i) && !progress.lessons[l.slug]?.completed
  );

  const weeks = Array.from(new Set(curriculum.map((l) => l.week))).sort((a, b) => a - b);

  const sidebar = (
    <div className="space-y-4">
      {/* Daily goal */}
      <div className="surface p-5">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 shrink-0">
            <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="4.5" className="stroke-stone-200 dark:stroke-stone-700" />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                strokeWidth="4.5"
                strokeLinecap="round"
                className="stroke-saffron-500 transition-all duration-700"
                strokeDasharray={`${(goalPct / 100) * 97.4} 97.4`}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xl">
              {goalPct >= 100 ? '🎉' : '🎯'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-ink dark:text-white leading-tight">
              {goalPct >= 100 ? 'Goal smashed!' : 'Daily goal'}
            </p>
            <p className="text-sm text-ink-soft dark:text-stone-400 mt-0.5">
              {xpToday} / {progress.dailyGoal} XP today
            </p>
            <div className="mt-2 h-1.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-saffron-500 transition-all duration-700"
                style={{ width: `${goalPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="surface p-5">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-2xl font-extrabold text-terra-500">{streak}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft dark:text-stone-400 mt-0.5">
              🔥 streak
            </p>
          </div>
          <div className="border-x border-stone-100 dark:border-stone-800">
            <p className="text-2xl font-extrabold text-brand-600 dark:text-brand-400">{wordsKnown}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft dark:text-stone-400 mt-0.5">
              words
            </p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-saffron-500">{progress.xp}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft dark:text-stone-400 mt-0.5">
              ⚡ total xp
            </p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-stone-100 dark:border-stone-800">
          <div className="flex justify-between text-xs font-semibold text-ink-soft dark:text-stone-400 mb-1.5">
            <span>Course progress</span>
            <span>
              {lessonsDone}/{curriculum.length} lessons
            </span>
          </div>
          <div className="h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-700"
              style={{ width: `${Math.max(coursePct, 2)}%` }}
            />
          </div>
          {wordsMastered > 0 && (
            <p className="text-xs text-ink-soft dark:text-stone-400 mt-2">
              ✨ {wordsMastered} words fully mastered
            </p>
          )}
        </div>
      </div>

      {/* Talk to the AI tutor */}
      <Link
        href="/tutor"
        className="group relative block overflow-hidden rounded-3xl bg-gradient-to-br from-terra-500 via-terra-400 to-saffron-400 p-5 shadow-glow transition-transform active:scale-[0.99]"
      >
        <div className="absolute -right-5 -top-7 text-[92px] opacity-15 -rotate-12 select-none" aria-hidden>
          🧑‍🏫
        </div>
        <p className="font-extrabold text-white text-lg">Talk to your tutor</p>
        <p className="text-white/90 text-sm mt-1 leading-snug">
          A live, back-and-forth chat with Profe — speak or type, and hear Spanish back.
        </p>
        <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-extrabold text-white/95">
          Start talking
          <span className="transition-transform group-hover:translate-x-1">→</span>
        </span>
      </Link>

      {/* Smart practice */}
      {lessonsDone > 0 && (
        <Link
          href="/practice"
          className="group relative block overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-500 to-brand-400 p-5 shadow-glow transition-transform active:scale-[0.99]"
        >
          <div className="absolute -right-6 -top-8 text-[96px] opacity-15 rotate-12 select-none" aria-hidden>
            🧠
          </div>
          <p className="font-extrabold text-white text-lg">Smart Practice</p>
          <p className="text-brand-100 text-sm mt-1 leading-snug">
            A session built from the words your memory is about to drop.
          </p>
          <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-extrabold text-white/95">
            Start review
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </span>
        </Link>
      )}
    </div>
  );

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <nav className="sticky top-0 z-20 bg-paper/85 dark:bg-paper-dark/85 backdrop-blur-md border-b border-stone-200/70 dark:border-stone-800">
        <div className="max-w-5xl mx-auto px-4 lg:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="font-display text-2xl font-black text-brand-600 dark:text-brand-400">
            Aprende
          </Link>
          <div className="flex items-center gap-3 text-sm font-extrabold">
            <span
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 ${
                streak > 0
                  ? 'bg-terra-500/10 text-terra-500'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-400'
              }`}
              title="Day streak"
            >
              🔥 {streak}
            </span>
            <span
              className="flex items-center gap-1 rounded-full px-3 py-1.5 bg-saffron-500/10 text-saffron-600 dark:text-saffron-400"
              title="Total XP"
            >
              ⚡ {progress.xp}
            </span>
            <Link
              href="/account"
              title="Account & settings"
              aria-label="Account and settings"
              className="flex items-center justify-center w-9 h-9 rounded-full bg-stone-100 dark:bg-stone-800 text-ink-soft dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 12a4 4 0 100-8 4 4 0 000 8z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6" />
              </svg>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 lg:px-6 pt-8">
        {/* Page hero */}
        <header className="mb-8 lg:mb-10">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400 mb-2">
            Your course
          </p>
          <h1 className="font-display text-4xl lg:text-5xl font-black text-ink dark:text-white leading-[1.05]">
            The road to Spanish
          </h1>
          <p className="text-ink-soft dark:text-stone-400 mt-2 max-w-lg">
            Twenty-four weeks, six phases — from your first{' '}
            <em className="font-display">hola</em> to real conversations.
          </p>
        </header>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
          {/* Mobile stats */}
          <div className="lg:hidden mb-8">{sidebar}</div>

          {/* Learning path */}
          <div>
            {weeks.map((week, wi) => {
              const phase = phaseForWeek(week);
              const prevPhase = wi > 0 ? phaseForWeek(weeks[wi - 1]) : null;
              const isNewPhase = !prevPhase || prevPhase.number !== phase.number;
              return (
                <section key={week} className="mb-8">
                  {isNewPhase && (
                    <div className={`${wi === 0 ? 'mb-6' : 'mt-14 mb-6'}`}>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-stone-300 dark:to-stone-700" />
                        <p className="text-[11px] font-extrabold text-brand-600 dark:text-brand-400 uppercase tracking-[0.25em]">
                          Phase {phase.number}
                        </p>
                        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-stone-300 dark:to-stone-700" />
                      </div>
                      <h2 className="font-display text-3xl font-black text-ink dark:text-white text-center mt-2">
                        {phase.title}
                      </h2>
                      <p className="text-sm text-ink-soft dark:text-stone-400 text-center mt-1">
                        {phase.subtitle}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-[11px] font-extrabold text-stone-400 dark:text-stone-500 uppercase tracking-[0.2em]">
                      Week {week}
                    </h3>
                    <div className="flex-1 h-px bg-stone-200/80 dark:bg-stone-800" />
                  </div>

                  <div className="space-y-3.5">
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
                            className={`relative rounded-3xl p-5 transition-all duration-200 ${
                              !unlocked
                                ? 'bg-paper-soft dark:bg-paper-dark-soft/60 border border-stone-200/60 dark:border-stone-800/60 opacity-55 saturate-50'
                                : isCurrent
                                  ? 'bg-white dark:bg-paper-dark-soft border-2 border-brand-400 dark:border-brand-500 shadow-card animate-glow-pulse'
                                  : 'surface hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-0 active:shadow-card'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div
                                className={`relative w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center text-[28px] bg-gradient-to-br ${
                                  unlocked
                                    ? accent
                                    : 'from-stone-300 to-stone-400 dark:from-stone-700 dark:to-stone-800'
                                } shadow-inner ring-1 ring-black/5`}
                              >
                                <span className="drop-shadow-sm">{unlocked ? lesson.emoji : '🔒'}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-extrabold text-ink dark:text-white truncate text-[15px]">
                                  {lesson.title}
                                </p>
                                <p className="text-sm text-ink-soft dark:text-stone-400 truncate mt-0.5">
                                  {lesson.subtitle}
                                </p>
                                {record?.completed && (
                                  <p className="text-saffron-500 text-[13px] mt-1 tracking-wide" aria-label={`${stars} stars`}>
                                    {'★'.repeat(stars)}
                                    <span className="text-stone-300 dark:text-stone-600">
                                      {'★'.repeat(3 - stars)}
                                    </span>
                                    <span className="text-xs text-stone-400 dark:text-stone-500 ml-2 font-semibold">
                                      best {record.bestAccuracy}%
                                    </span>
                                  </p>
                                )}
                              </div>
                              {unlocked && (
                                <span
                                  className={`shrink-0 px-4 py-2 rounded-xl text-[13px] font-extrabold tracking-wide ${
                                    isCurrent
                                      ? 'btn-primary px-5'
                                      : 'bg-stone-100 dark:bg-stone-800 text-ink-soft dark:text-stone-300'
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
              );
            })}

            <p className="text-center text-xs text-stone-400 dark:text-stone-600 mt-12 font-medium">
              24 weeks · 6 phases · from first words to real conversations&nbsp;🇪🇸
            </p>
          </div>

          {/* Desktop sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-20">{sidebar}</div>
          </aside>
        </div>
      </div>
    </div>
  );
}
