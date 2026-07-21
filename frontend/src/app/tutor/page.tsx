'use client';

import { Suspense, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRequireAuth } from '@/lib/hooks';
import { RealtimeCall } from '@/components/RealtimeCall';
import { buildTutorContext } from '@/lib/tutor-context';
import { reflectAndSave, markEvaluationDone } from '@/lib/tutor-memory';

function TutorPageInner() {
  const { isLoading } = useRequireAuth();
  const router = useRouter();
  const params = useSearchParams();
  const slug = params.get('lesson') || undefined;

  // Built client-side from the learner's progress + memory once authed.
  const ctx = useMemo(
    () => (typeof window === 'undefined' || isLoading ? null : buildTutorContext(slug)),
    [isLoading, slug]
  );

  // The call ended — distil it into the tutor's memory, then head back.
  const handleClose = useCallback(
    (transcript: Array<{ role: 'user' | 'assistant'; content: string }>) => {
      const wasEval = !!ctx?.evaluation;
      void (async () => {
        await reflectAndSave(transcript, wasEval);
        if (wasEval) markEvaluationDone();
      })();
      router.push('/lessons');
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
