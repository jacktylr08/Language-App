'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/lib/hooks';
import { AbilitiesPanel } from '@/components/AbilitiesPanel';
import { curriculum, phaseForWeek } from '@/lib/curriculum';
import {
  loadProgress,
  currentStreak,
  knownWordCount,
  lessonStars,
  ProgressState,
} from '@/lib/progress';
import { combinedMistakeCount } from '@/lib/learner-insights';

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
  const wordsKnown = knownWordCount(progress);
  const mistakes = combinedMistakeCount();
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
  const nextLesson = currentIndex >= 0 ? curriculum[currentIndex] : null;

  const weeks = Array.from(new Set(curriculum.map((l) => l.week))).sort((a, b) => a - b);

  const sidebar = (
    <div className="space-y-4">
      {/* Continue — the main call-to-action, right at the top */}
      {nextLesson ? (
        <Link
          href={`/lessons/${nextLesson.slug}`}
          className="group relative block overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-500 to-brand-400 p-5 shadow-glow transition-transform active:scale-[0.99]"
        >
          <div className="absolute -right-4 -top-6 text-[80px] opacity-15 select-none" aria-hidden>
            {nextLesson.emoji}
          </div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-white/80">
            {lessonsDone > 0 ? 'Pick up where you left off' : 'Start here'}
          </p>
          <p className="font-extrabold text-white text-lg mt-1 leading-tight">{nextLesson.title}</p>
          <p className="text-white/85 text-sm mt-0.5">
            Week {nextLesson.week} · {lessonsDone}/{curriculum.length} lessons done
          </p>
          <div className="mt-3 h-1.5 rounded-full bg-white/25 overflow-hidden">
            <div
              className="h-full rounded-full bg-white/90 transition-all duration-700"
              style={{ width: `${Math.max(coursePct, 3)}%` }}
            />
          </div>
          <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-extrabold text-white">
            Continue
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </span>
        </Link>
      ) : (
        <div className="surface p-5 text-center">
          <p className="text-3xl mb-1">🏆</p>
          <p className="font-extrabold text-ink dark:text-white">Course complete!</p>
          <p className="text-sm text-ink-soft dark:text-stone-400 mt-1">
            You’ve finished every lesson. Keep it sharp with a chat or a mistakes review.
          </p>
        </div>
      )}

      {/* Practical "can-do" abilities — progress by what you can actually do */}
      <AbilitiesPanel />

      {/* Talk to the AI tutor — a live voice call */}
      <Link
        href="/tutor"
        className="group relative block overflow-hidden rounded-3xl bg-gradient-to-br from-terra-500 via-terra-400 to-saffron-400 p-5 shadow-glow transition-transform active:scale-[0.99]"
      >
        <div className="absolute -right-5 -top-7 text-[92px] opacity-15 -rotate-12 select-none" aria-hidden>
          🧑‍🏫
        </div>
        <p className="font-extrabold text-white text-lg">Talk to your tutor</p>
        <p className="text-white/90 text-sm mt-1 leading-snug">
          A live voice conversation with Profe — speak naturally, get corrected, at your level.
        </p>
        <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-extrabold text-white/95">
          Start a call
          <span className="transition-transform group-hover:translate-x-1">→</span>
        </span>
      </Link>

      {/* Review your mistakes — built from what you've got wrong */}
      {mistakes > 0 && (
        <Link
          href="/practice?mode=mistakes"
          className="group relative block overflow-hidden rounded-3xl bg-gradient-to-br from-rose-500 via-rose-400 to-terra-400 p-5 shadow-glow transition-transform active:scale-[0.99]"
        >
          <div className="absolute -right-6 -top-8 text-[96px] opacity-15 rotate-12 select-none" aria-hidden>
            🩹
          </div>
          <p className="font-extrabold text-white text-lg">Fix your mistakes</p>
          <p className="text-white/90 text-sm mt-1 leading-snug">
            {mistakes} {mistakes === 1 ? 'word' : 'words'} you’ve slipped up on — let’s nail them.
          </p>
          <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-extrabold text-white/95">
            Review now
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </span>
        </Link>
      )}

      {/* Quiet progress line — no XP, just what matters */}
      <p className="text-center text-xs text-ink-soft dark:text-stone-500 font-medium pt-1">
        🔥 {streak} day streak · {wordsKnown} words known
      </p>
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

          {/* Desktop sidebar — pinned below the nav, scrolls on its own */}
          <aside className="hidden lg:block">
            <div className="no-scrollbar sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain pb-6">
              {sidebar}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
