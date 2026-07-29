'use client';

import Link from 'next/link';
import { CourseChip } from '@/components/CourseChip';
import { BrandLockup } from '@/components/icons/BrandMark';
import { useRedirectIfAuthenticated } from '@/lib/hooks';
import { getCurriculum, getAllVocab } from '@/lib/curriculum';
import { EXERCISE_TYPE_COUNT } from '@/lib/exercise-engine';
import { PageSkeleton } from '@/components/Skeleton';
import { GuestStartButton } from '@/components/GuestStartButton';
import { Icon } from '@/components/icons/Icon';
import { Profe } from '@/components/Profe';

const phases = [
  { n: '01', title: 'Foundations', desc: 'Your first words, sounds and sentences.' },
  { n: '02', title: 'Building Blocks', desc: 'The verb machine, questions, restaurant Spanish.' },
  { n: '03', title: 'Past & Future', desc: 'Tell stories. Make plans. Own every tense.' },
  { n: '04', title: 'Everyday Life', desc: 'Opinions, routines, shopping, doctors, hotels.' },
  { n: '05', title: 'Power Grammar', desc: 'Pronouns, perfect, conditional, subjunctive.' },
  { n: '06', title: 'Fluency', desc: 'Debate, storytelling, and sounding native.' },
];

/**
 * Counted from the curriculum rather than typed in. These were hand-written
 * and had drifted low (47 lessons and "450+" words against a real 54 and 522)
 * — deriving them means adding content updates the pitch for free, and the
 * first thing a visitor reads is always true.
 */
function courseStats(): Array<[string, string]> {
  const curriculum = getCurriculum();
  const weeks = curriculum.length ? Math.max(...curriculum.map((l) => l.week)) : 0;
  return [
    [String(curriculum.length), 'interactive lessons'],
    [`${Math.floor(getAllVocab().length / 50) * 50}+`, 'words & phrases'],
    [String(EXERCISE_TYPE_COUNT), 'exercise types'],
    [String(weeks), 'weeks to fluency'],
  ];
}

export default function HomePage() {
  // Already signed in? This landing page ("start learning") is for visitors —
  // bounce straight to the real dashboard instead, same pattern as /login
  // and /register redirecting an already-authenticated visitor away from
  // forms they don't need. This is also what makes clicking the "Fluenta"
  // wordmark from anywhere in the app behave like a real home button: signed
  // in takes you to your dashboard, signed out takes you to this page.
  const { isLoading: redirectLoading } = useRedirectIfAuthenticated();

  if (redirectLoading) {
    return (
      <PageSkeleton />
    );
  }

  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-20 bg-paper/85 dark:bg-paper-dark/85 backdrop-blur-md border-b border-stone-200/70 dark:border-stone-800">
        {/* min-w-0 + shrink on both sides: with the wordmark added, this row
            overflowed a 390px phone and pushed "Get started" off the edge.
            The course chip is the first thing to go — it's decoration next to
            a sign-in link. */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <BrandLockup />
            <span className="hidden sm:inline">
              <CourseChip />
            </span>
          </div>
          <div className="flex gap-1.5 sm:gap-3 items-center shrink-0">
            <Link
              href="/login"
              className="px-2.5 sm:px-4 py-2 text-ink-soft dark:text-stone-300 hover:text-ink dark:hover:text-white font-semibold text-sm whitespace-nowrap"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="btn-primary px-3.5 sm:px-5 py-2.5 text-sm whitespace-nowrap"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6">
        {/* Hero */}
        <section className="pt-14 pb-24 text-center">
          {/* The tutor is the product; he should be the first thing you see,
              not a claim in a paragraph. */}
          <Profe mood="speaking" size={124} className="mx-auto mb-5" />
          <p className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 text-brand-700 dark:text-brand-300 px-4 py-1.5 text-[13px] font-bold mb-8">
            A {courseStats()[3][0]}-week Spanish course with a tutor who actually talks back
          </p>
          <h2 className="font-display font-black text-ink dark:text-white text-5xl md:text-7xl leading-[1.02] tracking-tight max-w-3xl mx-auto">
            Stop tapping.{' '}
            <span className="relative inline-block text-brand-600 dark:text-brand-400">
              Start talking
              <svg
                className="absolute -bottom-2 left-0 w-full"
                viewBox="0 0 200 12"
                fill="none"
                aria-hidden
              >
                <path
                  d="M3 9c50-6 140-6 194-3"
                  stroke="#EDA417"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h2>
          <p className="text-lg md:text-xl text-ink-soft dark:text-stone-400 mt-7 max-w-xl mx-auto leading-relaxed">
            Have real spoken conversations with a Spanish tutor who remembers you, corrects you
            properly, and never runs out of patience. Plus {courseStats()[0][0]} lessons that
            teach you enough to hold your end of it.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <GuestStartButton className="btn-primary px-10 py-4 text-lg">
              Try a lesson — no signup
            </GuestStartButton>
            <Link
              href="/register"
              className="text-sm font-bold text-ink-soft dark:text-stone-400 underline underline-offset-4 hover:text-ink dark:hover:text-white"
            >
              or create an account
            </Link>
          </div>
          <p className="text-sm text-stone-400 dark:text-stone-500 font-medium mt-4">
            No account needed to start. Nothing to pay.
          </p>

          {/* Stats strip */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {courseStats().map(([n, label]) => (
              <div key={label} className="surface px-4 py-5">
                <p className="font-display text-3xl font-black text-brand-600 dark:text-brand-400">
                  {n}
                </p>
                <p className="text-xs font-semibold text-ink-soft dark:text-stone-400 mt-1 uppercase tracking-wide">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="pb-24">
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: 'chat' as const,
                accent: 'from-brand-400 to-brand-600',
                title: 'A tutor, not a quiz',
                description:
                  'Call Profe and just talk. He speaks at your exact level, lets you finish your sentence, and remembers what you struggled with last time.',
              },
              {
                icon: 'target' as const,
                accent: 'from-violet-400 to-purple-600',
                title: 'Knows what you’ll forget',
                description:
                  'Every word is scheduled to come back the day before you’d lose it — the same spaced-repetition model serious learners use, not a random shuffle.',
              },
              {
                icon: 'grammar' as const,
                accent: 'from-saffron-400 to-terra-500',
                title: 'Explains the why',
                description:
                  'Real grammar teaching with concept checks. Get one wrong and you’re told the reasoning, naming the exact word that was off — not just shown a red cross.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="surface p-7 hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200"
              >
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white bg-gradient-to-br ${feature.accent} shadow-inner ring-1 ring-black/5 mb-5`}
                >
                  <Icon name={feature.icon} size={26} />
                </div>
                <h3 className="font-display text-2xl font-black text-ink dark:text-white mb-2.5">
                  {feature.title}
                </h3>
                <p className="text-ink-soft dark:text-stone-400 leading-relaxed text-[15px]">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* The path */}
        <section className="pb-28">
          <div className="text-center mb-12">
            <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-brand-600 dark:text-brand-400 mb-3">
              The curriculum
            </p>
            <h3 className="font-display text-4xl md:text-5xl font-black text-ink dark:text-white">
              Six phases. One road.
            </h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {phases.map((phase) => (
              <div key={phase.n} className="surface p-6 flex gap-4 items-start">
                <span className="font-display text-3xl font-black text-stone-200 dark:text-stone-700 leading-none pt-0.5">
                  {phase.n}
                </span>
                <div>
                  <h4 className="font-extrabold text-ink dark:text-white">{phase.title}</h4>
                  <p className="text-sm text-ink-soft dark:text-stone-400 mt-1 leading-snug">
                    {phase.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-14">
            <GuestStartButton className="btn-primary px-10 py-4 text-lg">
              Start with week one
            </GuestStartButton>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200/70 dark:border-stone-800 py-8 text-center">
        <p className="font-display text-lg font-black text-brand-600 dark:text-brand-400">Fluenta</p>
        <p className="text-xs text-stone-400 dark:text-stone-600 mt-1">
          Hasta la fluidez, siempre. 🇪🇸
        </p>
      </footer>
    </div>
  );
}
