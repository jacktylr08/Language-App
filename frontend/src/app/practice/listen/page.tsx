'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/lib/hooks';
import { buildListenRepeatQueue } from '@/lib/listen-repeat';
import { ListenRepeat } from '@/components/ListenRepeat';

export default function ListenRepeatPage() {
  const router = useRouter();
  const { isLoading } = useRequireAuth();

  const words = useMemo(
    () => (typeof window === 'undefined' || isLoading ? null : buildListenRepeatQueue()),
    [isLoading]
  );

  if (isLoading || words === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500" />
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <p className="text-4xl mb-3">🎧</p>
        <p className="font-extrabold text-ink dark:text-white text-lg">Nothing to review yet</p>
        <p className="text-sm text-ink-soft dark:text-stone-400 mt-1 max-w-xs">
          Finish a lesson or two first — Listen &amp; Repeat pulls from words you've already met.
        </p>
        <button onClick={() => router.push('/lessons')} className="btn-primary mt-6 px-8 py-3">
          Back to lessons
        </button>
      </div>
    );
  }

  return <ListenRepeat words={words} onClose={() => router.push('/lessons')} />;
}
