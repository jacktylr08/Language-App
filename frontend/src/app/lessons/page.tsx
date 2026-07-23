'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/lib/hooks';
import { AbilitiesPanel } from '@/components/AbilitiesPanel';
import { getCurriculum, phaseForWeek } from '@/lib/curriculum';
import {
  loadProgress,
  currentStreak,
  knownWordCount,
  lessonStars,
  recentActivity,
  isLessonDone,
  ProgressState,
} from '@/lib/progress';
import { combinedMistakeCount } from '@/lib/learner-insights';
import { buildTutorContext } from '@/lib/tutor-context';
import { CourseChip } from '@/components/CourseChip';
import { SCENARIOS } from '@/lib/scenarios';

/** A cadence line so the tutor card reflects an actual relationship, not a static pitch. */
function cadenceLabel(days: number | undefined): string {
  if (days === undefined) return "Say hello to Profe";
  if (days <= 0) return 'You talked today';
  if (days === 1) return 'You talked yesterday';
  if (days < 7) return `${days} days since you last talked`;
  return "It's been a while — Profe's ready when you are";
}

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

const practiceLinks = [
  {
    href: '/practice/listen',
    emoji: '🎧',
    label: 'Listen & Repeat',
    description: 'Hands-free vocab review, eyes off the screen.',
  },
  {
    href: '/read',
    emoji: '📖',
    label: 'Read in Spanish',
    description: 'Short passages — tap any word instead of a full translation.',
  },
] as const;

export default function LessonsPage() {
  const { user, isLoading: authLoading } = useRequireAuth();
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [tutorCtx, setTutorCtx] = useState<ReturnType<typeof buildTutorContext> | null>(null);
  // null = no manual override yet — phases fall back to the sensible default
  // (only the phase with the learner's next lesson starts open) computed
  // once progress has loaded, below.
  const [expandedOverride, setExpandedOverride] = useState<Record<number, boolean> | null>(null);

  useEffect(() => {
    setProgress(loadProgress());
    setTutorCtx(buildTutorContext());
  }, []);

  if (authLoading || !progress) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500" />
      </div>
    );
  }

  const curriculum = getCurriculum();
  const streak = currentStreak(progress);
  const wordsKnown = knownWordCount(progress);
  const mistakes = combinedMistakeCount();
  // "Done" (real completions) stays separate from "placed out of at
  // onboarding" (skipped) — the journey stat below should be honest about
  // which is which, even though both count toward being unlocked/reached.
  const lessonsDone = curriculum.filter((l) => progress.lessons[l.slug]?.completed).length;
  const lessonsSkipped = curriculum.filter(
    (l) => progress.lessons[l.slug]?.skipped && !progress.lessons[l.slug]?.completed
  ).length;
  const coursePct = Math.round(((lessonsDone + lessonsSkipped) / curriculum.length) * 100);
  const activity = recentActivity(progress, 14);

  // A lesson unlocks once the previous one is behind the learner — really
  // completed, or placed-out-of at onboarding.
  const isUnlocked = (index: number): boolean => {
    if (index === 0) return true;
    return isLessonDone(progress.lessons[curriculum[index - 1].slug]);
  };
  const currentIndex = curriculum.findIndex(
    (l, i) => isUnlocked(i) && !isLessonDone(progress.lessons[l.slug])
  );
  const nextLesson = currentIndex >= 0 ? curriculum[currentIndex] : null;

  const weeks = Array.from(new Set(curriculum.map((l) => l.week))).sort((a, b) => a - b);

  // Group weeks into their phase, and work out each phase's own completion —
  // this is what lets the page collapse everything down to "the one phase
  // you're actually in" by default instead of one long 50+ card scroll.
  interface PhaseGroup {
    number: number;
    title: string;
    subtitle: string;
    weeks: number[];
    lessons: (typeof curriculum)[number][];
  }
  const phaseGroups: PhaseGroup[] = [];
  for (const week of weeks) {
    const phase = phaseForWeek(week);
    let group = phaseGroups.find((g) => g.number === phase.number);
    if (!group) {
      group = { number: phase.number, title: phase.title, subtitle: phase.subtitle, weeks: [], lessons: [] };
      phaseGroups.push(group);
    }
    group.weeks.push(week);
  }
  for (const lesson of curriculum) {
    phaseGroups.find((g) => g.number === phaseForWeek(lesson.week).number)!.lessons.push(lesson);
  }

  const currentPhaseNumber = nextLesson
    ? phaseForWeek(nextLesson.week).number
    : phaseGroups[phaseGroups.length - 1]?.number ?? 1;

  const isPhaseExpanded = (phaseNumber: number): boolean =>
    expandedOverride ? !!expandedOverride[phaseNumber] : phaseNumber === currentPhaseNumber;

  const togglePhase = (phaseNumber: number): void => {
    setExpandedOverride((prev) => {
      const base = prev ?? { [currentPhaseNumber]: true };
      return { ...base, [phaseNumber]: !(base[phaseNumber] ?? phaseNumber === currentPhaseNumber) };
    });
  };

  const sidebar = (
    <div className="space-y-4">
      {/* Your journey — the main summary, shown first */}
      <div className="surface p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink-soft dark:text-stone-400">
            Your journey
          </p>
          <span className="text-xs font-extrabold text-brand-600 dark:text-brand-400">
            {coursePct}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-stone-200/80 dark:bg-stone-800 overflow-hidden mb-1.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
            style={{ width: `${Math.max(coursePct, 2)}%` }}
          />
        </div>
        {lessonsSkipped > 0 && (
          <p className="text-[11px] text-ink-soft/70 dark:text-stone-500 mb-4">
            {lessonsSkipped} lesson{lessonsSkipped === 1 ? '' : 's'} placed out of at signup
          </p>
        )}
        <div className={`grid grid-cols-2 gap-3 ${lessonsSkipped > 0 ? '' : 'mt-4'} mb-4`}>
          <div>
            <p className="font-display text-2xl font-black text-ink dark:text-white leading-none">
              {wordsKnown}
            </p>
            <p className="text-xs text-ink-soft dark:text-stone-400 mt-1">words known</p>
          </div>
          <div>
            <p className="font-display text-2xl font-black text-ink dark:text-white leading-none">
              {progress.bestStreak}
            </p>
            <p className="text-xs text-ink-soft dark:text-stone-400 mt-1">best streak</p>
          </div>
        </div>
        <div className="flex items-center gap-1" title="Last 14 days">
          {activity.map((active, i) => (
            <span
              key={i}
              className={`h-2 flex-1 rounded-full ${
                active ? 'bg-terra-500' : 'bg-stone-200 dark:bg-stone-800'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Continue — pick up where you left off, right next to the journey summary */}
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

      {/* Talk to the AI tutor — reflects the actual relationship, not a static pitch */}
      <Link
        href="/tutor"
        className="group relative block overflow-hidden rounded-3xl bg-gradient-to-br from-terra-500 via-terra-400 to-saffron-400 p-5 shadow-glow transition-transform active:scale-[0.99]"
      >
        <div className="absolute -right-5 -top-7 text-[92px] opacity-15 -rotate-12 select-none" aria-hidden>
          🧑‍🏫
        </div>
        {tutorCtx?.lastSessionNote ? (
          <>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-white/80">
              {cadenceLabel(tutorCtx.daysSinceLastSession)}
            </p>
            <p className="font-extrabold text-white text-lg mt-1 leading-tight">Continue with Profe</p>
            <p className="text-white/90 text-sm mt-1 leading-snug line-clamp-2">
              &ldquo;{tutorCtx.lastSessionNote}&rdquo;
            </p>
          </>
        ) : (
          <>
            <p className="font-extrabold text-white text-lg">Talk to your tutor</p>
            <p className="text-white/90 text-sm mt-1 leading-snug">
              A live voice conversation with Profe — speak naturally, get corrected, at your level.
            </p>
          </>
        )}
        <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-extrabold text-white/95">
          {tutorCtx?.lastSessionNote ? 'Continue the conversation' : 'Start a call'}
          <span className="transition-transform group-hover:translate-x-1">→</span>
        </span>
      </Link>

      {/* Every other way to practice, gathered in one compact card instead
          of a stack of full-size hero banners — the same features, just not
          five screens' worth of space to get to the lesson list below. */}
      <div className="surface p-5">
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink-soft dark:text-stone-400 mb-3">
          More practice
        </p>
        <div className="space-y-1">
          {mistakes > 0 && (
            <Link
              href="/practice?mode=mistakes"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 -mx-3 bg-terra-500/10 hover:bg-terra-500/15 transition-colors"
            >
              <span className="text-xl shrink-0" aria-hidden>🩹</span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-bold text-terra-600 dark:text-terra-400">
                  Fix your mistakes
                </span>
                <span className="block text-xs text-ink-soft dark:text-stone-400">
                  {mistakes} {mistakes === 1 ? 'word' : 'words'} to nail
                </span>
              </span>
              <span className="text-terra-500 shrink-0" aria-hidden>→</span>
            </Link>
          )}
          {practiceLinks.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 -mx-3 hover:bg-stone-50 dark:hover:bg-stone-800/60 transition-colors"
            >
              <span className="text-xl shrink-0" aria-hidden>{p.emoji}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-bold text-ink dark:text-stone-200">
                  {p.label}
                </span>
                <span className="block text-xs text-ink-soft dark:text-stone-400 truncate">
                  {p.description}
                </span>
              </span>
              <span className="text-stone-300 dark:text-stone-600 shrink-0" aria-hidden>→</span>
            </Link>
          ))}
        </div>

        <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink-soft dark:text-stone-400 mt-5 mb-3">
          Practice a scenario
        </p>
        <div className="grid grid-cols-2 gap-2">
          {SCENARIOS.map((s) => (
            <Link
              key={s.id}
              href={`/tutor?scenario=${s.id}`}
              className="flex items-center gap-2 rounded-xl bg-stone-50 dark:bg-stone-800/60 hover:bg-stone-100 dark:hover:bg-stone-800 px-3 py-2.5 transition-colors"
              title={s.description}
            >
              <span className="text-lg" aria-hidden>{s.emoji}</span>
              <span className="text-[13px] font-bold text-ink dark:text-stone-200 leading-tight">
                {s.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <nav className="sticky top-0 z-20 bg-paper/85 dark:bg-paper-dark/85 backdrop-blur-md border-b border-stone-200/70 dark:border-stone-800">
        <div className="max-w-5xl mx-auto px-4 lg:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link href="/" className="font-display text-2xl font-black text-brand-600 dark:text-brand-400">
              Fluenta
            </Link>
            <CourseChip />
          </div>
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

          {/* Learning path — collapsed to phase summaries by default (only
              the phase with your next lesson opens automatically) so this
              is a handful of rows to scan, not 50+ lesson cards in one
              scroll. Nothing is removed — every phase expands to the exact
              same cards it always showed, on demand. */}
          <div>
            {phaseGroups.map((group, gi) => {
              const doneCount = group.lessons.filter((l) => isLessonDone(progress.lessons[l.slug])).length;
              const totalCount = group.lessons.length;
              const isComplete = doneCount === totalCount;
              const isCurrentPhase = group.number === currentPhaseNumber;
              const firstIndex = curriculum.findIndex((l) => l.slug === group.lessons[0].slug);
              const isLocked = !isUnlocked(firstIndex);
              const expanded = isPhaseExpanded(group.number);
              const phasePct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

              return (
                <section key={group.number} className={gi === 0 ? 'mb-4' : 'mt-4 mb-4'}>
                  <button
                    type="button"
                    onClick={() => togglePhase(group.number)}
                    aria-expanded={expanded}
                    className="w-full flex items-center gap-4 surface p-4 text-left transition-shadow hover:shadow-card-hover"
                  >
                    <div
                      className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black ${
                        isComplete
                          ? 'bg-brand-500 text-white'
                          : isCurrentPhase
                            ? 'bg-brand-500/15 text-brand-600 dark:text-brand-400 ring-2 ring-brand-400 dark:ring-brand-500'
                            : isLocked
                              ? 'bg-stone-200 dark:bg-stone-800 text-stone-400 dark:text-stone-500'
                              : 'bg-stone-100 dark:bg-stone-800 text-ink-soft dark:text-stone-300'
                      }`}
                    >
                      {isComplete ? '✓' : isLocked ? '🔒' : group.number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-brand-600 dark:text-brand-400">
                        Phase {group.number}
                      </p>
                      <p className="font-display text-xl font-black text-ink dark:text-white leading-tight truncate">
                        {group.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="h-1 flex-1 max-w-[140px] rounded-full bg-stone-200/80 dark:bg-stone-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isComplete ? 'bg-brand-500' : 'bg-brand-400'}`}
                            style={{ width: `${Math.max(phasePct, doneCount > 0 ? 4 : 0)}%` }}
                          />
                        </div>
                        <p className="text-xs text-ink-soft dark:text-stone-400 shrink-0">
                          {doneCount}/{totalCount} lessons
                        </p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 text-stone-400 dark:text-stone-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
                      aria-hidden
                    >
                      ▾
                    </span>
                  </button>

                  {expanded && (
                    <div className="mt-5 pl-1">
                      <p className="text-sm text-ink-soft dark:text-stone-400 mb-5 px-1">{group.subtitle}</p>
                      {group.weeks.map((week) => (
                        <div key={week} className="mb-8 last:mb-0">
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
                                const isSkipped = !!record?.skipped && !record?.completed;
                                const stars = lessonStars(record);
                                const accent = themeAccents[lesson.theme] || themeAccents.phonetics;

                                const card = (
                                  <div
                                    className={`relative rounded-3xl p-5 transition-all duration-200 ${
                                      !unlocked
                                        ? 'bg-paper-soft dark:bg-paper-dark-soft/60 border border-stone-200/60 dark:border-stone-800/60 opacity-55 saturate-50'
                                        : isCurrent
                                          ? 'bg-white dark:bg-paper-dark-soft border-2 border-brand-400 dark:border-brand-500 shadow-card animate-glow-pulse'
                                          : isSkipped
                                            ? 'surface border border-dashed border-stone-300 dark:border-stone-700 opacity-80 hover:opacity-100 hover:shadow-card-hover'
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
                                        {record?.completed ? (
                                          <p className="text-saffron-500 text-[13px] mt-1 tracking-wide" aria-label={`${stars} stars`}>
                                            {'★'.repeat(stars)}
                                            <span className="text-stone-300 dark:text-stone-600">
                                              {'★'.repeat(3 - stars)}
                                            </span>
                                            <span className="text-xs text-stone-400 dark:text-stone-500 ml-2 font-semibold">
                                              best {record.bestAccuracy}%
                                            </span>
                                          </p>
                                        ) : isSkipped ? (
                                          <p className="text-[12px] text-ink-soft/70 dark:text-stone-500 mt-1 italic">
                                            Placed out at signup — not actually done
                                          </p>
                                        ) : null}
                                      </div>
                                      {unlocked && (
                                        <span
                                          className={`shrink-0 px-4 py-2 rounded-xl text-[13px] font-extrabold tracking-wide ${
                                            isCurrent
                                              ? 'btn-primary px-5'
                                              : 'bg-stone-100 dark:bg-stone-800 text-ink-soft dark:text-stone-300'
                                          }`}
                                        >
                                          {isCurrent ? 'START' : record?.completed ? 'REDO' : isSkipped ? 'REVIEW' : 'START'}
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
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}

            <div className="surface p-6 mt-8 text-center">
              <p className="text-2xl mb-1" aria-hidden>🏁</p>
              <p className="font-extrabold text-ink dark:text-white">
                {lessonsDone + lessonsSkipped} of {curriculum.length} lessons behind you
              </p>
              <p className="text-xs text-stone-400 dark:text-stone-600 mt-1 font-medium">
                24 weeks · 6 phases · from first words to real conversations&nbsp;🇪🇸
              </p>
            </div>
          </div>

          {/* Desktop sidebar — pinned below the nav, scrolls on its own until
              you reach its end, then scroll continues naturally onto the
              page (overscroll-contain previously blocked that handoff, so
              wheel/trackpad scrolling just dead-ended at the sidebar's own
              bottom instead of continuing). */}
          <aside className="hidden lg:block">
            <div className="no-scrollbar sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto pb-6">
              {sidebar}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
