'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRequireAuth } from '@/lib/hooks';
import { LessonEngine } from '@/components/LessonEngine';

function PracticeInner() {
  const { isLoading: authLoading } = useRequireAuth();
  const params = useSearchParams();
  const mode = params.get('mode') === 'mistakes' ? 'mistakes' : 'practice';

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-paper dark:bg-paper-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500" />
      </div>
    );
  }

  return <LessonEngine lesson={null} mode={mode} />;
}

export default function PracticePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-paper dark:bg-paper-dark">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500" />
        </div>
      }
    >
      <PracticeInner />
    </Suspense>
  );
}
