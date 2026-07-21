'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRequireAuth } from '@/lib/hooks';
import { TutorChat } from '@/components/TutorChat';

function TutorPageInner() {
  const { isLoading } = useRequireAuth();
  const params = useSearchParams();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500" />
      </div>
    );
  }

  // Optionally focus the session on a specific lesson; the tutor derives the
  // learner's level and known vocabulary from their saved progress.
  const slug = params.get('lesson') || undefined;

  return <TutorChat focusSlug={slug} />;
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
