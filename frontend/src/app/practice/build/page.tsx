'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRequireAuth, useSyncedState } from '@/lib/hooks';
import { LessonSkeleton } from '@/components/Skeleton';
import { SentenceBuilder } from '@/components/SentenceBuilder';
import { Profe } from '@/components/Profe';
import { Icon } from '@/components/icons/Icon';
import { StatCard } from '@/components/lesson-engine/StatCard';
import { Confetti } from '@/components/Confetti';
import {
  buildSentenceSession,
  sentenceScopeSummary,
  type ScopedSentence,
} from '@/lib/sentence-scope';
import { loadProgress } from '@/lib/progress';
import { primeAudio } from '@/lib/feedback';

/**
 * Sentence building — the section for the gap between knowing words and being
 * able to say something.
 *
 * Its own route rather than another mode of LessonEngine: the engine is built
 * around a queue of item-level exercises with a shared grading path, and every
 * one of its exercise types hands the learner the answer in some form. This is
 * a different skill with a different progression (see SentenceBuilder), and
 * bolting it on would have meant contorting both.
 */

type Phase = 'intro' | 'running' | { kind: 'done'; answered: number; correct: number };

export default function SentenceBuildPage() {
  const { isLoading } = useRequireAuth();
  const router = useRouter();
  const syncTick = useSyncedState();
  const [phase, setPhase] = useState<Phase>('intro');
  const [queue, setQueue] = useState<ScopedSentence[]>([]);
  const [summary, setSummary] = useState<ReturnType<typeof sentenceScopeSummary> | null>(null);

  useEffect(() => {
    if (isLoading) return;
    setSummary(sentenceScopeSummary());
  }, [isLoading, syncTick, phase]);

  if (isLoading || !summary) return <LessonSkeleton />;

  // Nothing unlocked yet. This is the honest state for a brand-new learner:
  // the section's whole promise is that it only ever asks for what they've
  // been taught, so before they've finished a lesson there is genuinely
  // nothing it can ask.
  if (summary.total === 0) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center max-w-sm mx-auto">
        <Profe mood="encouraging" size={104} className="mb-4" />
        <h1 className="font-display text-3xl font-black text-ink dark:text-white mb-2">
          Finish a lesson first
        </h1>
        <p className="text-ink-soft dark:text-stone-400 mb-7">
          This section only ever asks you to build sentences from lessons you&rsquo;ve actually
          completed — so there&rsquo;s nothing here until you&rsquo;ve done one.
        </p>
        <Link href="/lessons" className="btn-primary w-full py-4">
          Go to your course
        </Link>
      </div>
    );
  }

  if (phase === 'running') {
    return (
      <SentenceBuilder
        queue={queue}
        onDone={(stats) => setPhase({ kind: 'done', ...stats })}
        onExit={() => router.push('/lessons')}
      />
    );
  }

  if (typeof phase === 'object') {
    const accuracy = phase.answered > 0 ? Math.round((phase.correct / phase.answered) * 100) : 0;
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 py-10">
        {accuracy >= 70 && <Confetti />}
        <div className="max-w-sm w-full text-center">
          <Profe mood="happy" size={120} className="mx-auto animate-pop mb-2" />
          <h1 className="font-display text-4xl font-black text-ink dark:text-white mb-1">
            {accuracy >= 90 ? '¡Qué bien!' : accuracy >= 60 ? 'Good work' : 'Every one counts'}
          </h1>
          <p className="text-ink-soft dark:text-stone-400 mb-7">
            {phase.correct} of {phase.answered} sentences built
          </p>
          <div className="grid grid-cols-2 gap-3 mb-7">
            <StatCard label="Accuracy" value={`${accuracy}%`} color="text-brand-500" delay="0ms" />
            <StatCard
              label="Can say unaided"
              value={`${summary.free}`}
              color="text-terra-500"
              delay="120ms"
            />
          </div>
          <button
            onClick={() => {
              const next = buildSentenceSession();
              if (next.length === 0) {
                router.push('/lessons');
                return;
              }
              setQueue(next);
              setPhase('running');
            }}
            className="btn-primary w-full py-4"
          >
            Another round
          </button>
          <Link
            href="/lessons"
            className="block w-full py-3 mt-2 text-sm font-bold text-ink-soft dark:text-stone-400 hover:text-ink dark:hover:text-white"
          >
            Back to your course
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] max-w-sm w-full mx-auto">
      <Link
        href="/lessons"
        aria-label="Back to your course"
        className="shrink-0 self-start -ml-2 p-2 text-ink-soft dark:text-stone-400 hover:text-ink dark:hover:text-white"
      >
        <Icon name="arrow-left" size={22} />
      </Link>

      <div className="flex-1 flex flex-col justify-center text-center">
        <Profe mood="speaking" size={112} className="mx-auto mb-4" />
        <h1 className="font-display text-4xl font-black text-ink dark:text-white leading-[1.05] mb-3">
          Say something
          <br />
          <span className="text-brand-600 dark:text-brand-400">for real.</span>
        </h1>
        <p className="text-ink-soft dark:text-stone-400 leading-relaxed mb-7">
          Knowing words and being able to say a sentence are different skills. This builds the
          second one — same sentence, less help each time, until you can produce it from nothing.
        </p>

        {/* The scope, stated plainly. "Everything you've covered and nothing
            else" is the whole promise of this section, so it's shown as real
            numbers rather than left as a claim. */}
        <div className="surface p-5 text-left">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink-soft dark:text-stone-400 mb-3">
            Drawn from your {summary.lessons} completed lesson{summary.lessons === 1 ? '' : 's'}
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              ['New', summary.fresh, 'text-ink dark:text-white'],
              ['Building', summary.learning, 'text-saffron-600 dark:text-saffron-400'],
              ['Unaided', summary.free, 'text-brand-600 dark:text-brand-400'],
            ].map(([label, value, colour]) => (
              <div key={String(label)}>
                <p className={`font-display text-2xl font-black leading-none ${colour}`}>
                  {String(value)}
                </p>
                <p className="text-xs text-ink-soft dark:text-stone-400 mt-1">{String(label)}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-stone-400 dark:text-stone-600 mt-3">
            Nothing from lessons you haven&rsquo;t finished.
          </p>
        </div>
      </div>

      <div className="shrink-0">
        <button
          onClick={() => {
            const next = buildSentenceSession(loadProgress());
            if (next.length === 0) return;
            // Inside the gesture, or the first correct answer plays into a
            // suspended AudioContext.
            primeAudio();
            setQueue(next);
            setPhase('running');
          }}
          className="btn-primary w-full py-4 text-lg"
        >
          Start building
        </button>
      </div>
    </div>
  );
}
