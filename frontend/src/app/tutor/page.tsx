'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRequireAuth } from '@/lib/hooks';
import { TutorChat } from '@/components/TutorChat';
import { curriculum } from '@/lib/curriculum';

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

  // Optionally focus the session on a specific lesson's material.
  const slug = params.get('lesson');
  const lesson = slug ? curriculum.find((l) => l.slug === slug) : undefined;

  return (
    <TutorChat
      focus={lesson?.title}
      vocab={lesson?.vocab.map((v) => v.es)}
      level="beginner"
    />
  );
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
