'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRequireAuth } from '@/lib/hooks';
import { LessonEngine } from '@/components/LessonEngine';
import { LessonSkeleton } from '@/components/Skeleton';

function PracticeInner() {
  const { isLoading: authLoading } = useRequireAuth();
  const params = useSearchParams();
  const mode = params.get('mode') === 'mistakes' ? 'mistakes' : 'practice';

  if (authLoading) {
    return (
      <LessonSkeleton />
    );
  }

  return <LessonEngine lesson={null} mode={mode} />;
}

export default function PracticePage() {
  return (
    <Suspense
      fallback={
        <LessonSkeleton />
      }
    >
      <PracticeInner />
    </Suspense>
  );
}
