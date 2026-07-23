'use client';

import { Suspense, useCallback, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRequireAuth } from '@/lib/hooks';
import { RealtimeCall } from '@/components/RealtimeCall';
import { SessionReport } from '@/components/SessionReport';
import { buildTutorContext, buildScenarioContext } from '@/lib/tutor-context';
import { reflectAndSave, markEvaluationDone, type LearnerProfile } from '@/lib/tutor-memory';
import { getScenario } from '@/lib/scenarios';

type Phase = 'call' | 'reflecting' | { kind: 'report'; profile: LearnerProfile };

function TutorPageInner() {
  const { isLoading } = useRequireAuth();
  const router = useRouter();
  const params = useSearchParams();
  const slug = params.get('lesson') || undefined;
  const scenario = getScenario(params.get('scenario'));
  const [phase, setPhase] = useState<Phase>('call');

  // Built client-side from the learner's progress + memory once authed.
  // A scenario (if picked) replaces the curriculum-driven plan/focus but
  // keeps every other constraint (level ceiling, known vocab, memory).
  const ctx = useMemo(
    () =>
      typeof window === 'undefined' || isLoading
        ? null
        : scenario
        ? buildScenarioContext(scenario)
        : buildTutorContext(slug),
    [isLoading, slug, scenario]
  );

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500" />
      </div>
    );
  }

  if (phase === 'reflecting') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500" />
      </div>
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
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500" />
        </div>
      }
    >
      <TutorPageInner />
    </Suspense>
  );
}
