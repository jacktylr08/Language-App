'use client';

import { Suspense, useCallback, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRequireAuth } from '@/lib/hooks';
import { RealtimeCall } from '@/components/RealtimeCall';
import { SessionReport } from '@/components/SessionReport';
import { buildTutorContext, buildScenarioContext, buildHandoffContext } from '@/lib/tutor-context';
import { handoffFor } from '@/lib/lesson-handoff';
import { getCurriculum } from '@/lib/curriculum';
import { reflectAndSave, markEvaluationDone, type LearnerProfile } from '@/lib/tutor-memory';
import { getScenario } from '@/lib/scenarios';
import { PageSkeleton } from '@/components/Skeleton';
import Link from 'next/link';
import { isGuest } from '@/lib/guest';
import { Profe } from '@/components/Profe';

type Phase = 'call' | 'reflecting' | { kind: 'report'; profile: LearnerProfile };

function TutorPageInner() {
  const { isLoading } = useRequireAuth();
  const guest = isGuest();
  const router = useRouter();
  const params = useSearchParams();
  const slug = params.get('lesson') || undefined;
  const scenario = getScenario(params.get('scenario'));
  // Set only by the hand-off straight off the end of a lesson — see
  // lib/lesson-handoff.ts. It changes what Profe does with the first ten
  // seconds, which is the whole difference between a learner talking and a
  // learner staring at a call screen.
  const justFinished = params.get('just') === '1';
  const [phase, setPhase] = useState<Phase>('call');

  // Built client-side from the learner's progress + memory once authed.
  // A scenario (if picked) replaces the curriculum-driven plan/focus but
  // keeps every other constraint (level ceiling, known vocab, memory).
  const ctx = useMemo(() => {
    if (typeof window === 'undefined' || isLoading) return null;
    if (justFinished && slug) {
      const lesson = getCurriculum().find((l) => l.slug === slug);
      const handoff = handoffFor(lesson);
      if (lesson && handoff) {
        return buildHandoffContext(
          slug,
          handoff.task,
          lesson.vocab.map((v) => v.es),
          handoff.scenario
        );
      }
    }
    return scenario ? buildScenarioContext(scenario) : buildTutorContext(slug);
  }, [isLoading, slug, scenario, justFinished]);

  // The call ended — distil it into the tutor's memory, then show the
  // learner what came out of it (reflect() already computes concrete
  // mistakes and session-specific wins every session; this used to only
  // ever silently bias future prompts) before heading back to lessons.
  // reflectAndSave returns null (never a stale previously-stored profile)
  // whenever there's nothing fresh from THIS session to report — a failed
  // or skipped reflection must never display an old session's recap as if
  // it were the one that just happened.
  const handleClose = useCallback(
    (transcript: Array<{ role: 'user' | 'assistant'; content: string }>) => {
      const wasEval = !!ctx?.evaluation;
      setPhase('reflecting');
      void (async () => {
        const profile = await reflectAndSave(transcript, wasEval);
        if (wasEval) markEvaluationDone();
        if (profile && (profile.mistakes?.length || profile.sessionWins?.length || profile.sessionNote)) {
          setPhase({ kind: 'report', profile });
        } else {
          router.push('/lessons');
        }
      })();
    },
    [router, ctx]
  );

  if (isLoading || !ctx) {
    return (
      <PageSkeleton />
    );
  }

  /**
   * A live call needs a real account: it mints a server-side token and costs
   * money per minute, so it can't be handed to an anonymous browser. Rather
   * than letting a guest hit a 401, say what the thing is — this is what the
   * app does that competitors charge for, so it's also the most persuasive
   * page a guest can land on.
   */
  if (guest) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center">
          <Profe mood="idle" size={124} className="mx-auto mb-4" />
          <h1 className="font-display text-3xl font-black text-ink dark:text-white mb-2">
            Talk to Profe
          </h1>
          <p className="text-ink-soft dark:text-stone-400 leading-relaxed mb-6">
            A real spoken conversation, at your exact level, for as long as you like — he
            remembers you between calls and corrects you properly.
          </p>
          <div className="surface p-4 mb-6 text-left">
            <p className="text-sm text-ink-soft dark:text-stone-400 leading-relaxed">
              Live voice calls need an account — they run on your own tutor session rather than
              in this browser. Free, and everything you&apos;ve already done comes with you.
            </p>
          </div>
          <Link href="/register" className="btn-primary block w-full py-3.5 mb-2">
            Create a free account
          </Link>
          <Link
            href="/lessons"
            className="block w-full py-3 font-bold text-ink-soft dark:text-stone-400 hover:text-ink dark:hover:text-stone-200"
          >
            Back to lessons
          </Link>
        </div>
      </div>
    );
  }

  if (phase === 'reflecting') {
    return (
      <PageSkeleton />
    );
  }

  if (typeof phase === 'object' && phase.kind === 'report') {
    return (
      <SessionReport
        note={phase.profile.sessionNote}
        mistakes={phase.profile.mistakes ?? []}
        sessionWins={phase.profile.sessionWins ?? []}
        onContinue={() => router.push('/lessons')}
      />
    );
  }

  return <RealtimeCall context={ctx} onClose={handleClose} />;
}

export default function TutorPage() {
  return (
    <Suspense
      fallback={
        <PageSkeleton />
      }
    >
      <TutorPageInner />
    </Suspense>
  );
}
