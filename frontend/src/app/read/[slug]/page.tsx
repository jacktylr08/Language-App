'use client';

import { useRouter, useParams } from 'next/navigation';
import { useRequireAuth } from '@/lib/hooks';
import { getReading } from '@/lib/readings';
import { ReadingPassage } from '@/components/ReadingPassage';
import { PassageSkeleton } from '@/components/Skeleton';

export default function ReadingPage() {
  const router = useRouter();
  const params = useParams();
  const { isLoading } = useRequireAuth();
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const passage = getReading(slug);

  if (isLoading) {
    return (
      <PassageSkeleton />
    );
  }

  if (!passage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <p className="font-extrabold text-ink dark:text-white text-lg">Reading not found</p>
        <button onClick={() => router.push('/read')} className="btn-primary mt-6 px-8 py-3">
          Back to reading list
        </button>
      </div>
    );
  }

  return <ReadingPassage passage={passage} onClose={() => router.push('/read')} />;
}
