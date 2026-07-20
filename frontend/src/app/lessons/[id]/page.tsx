'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRequireAuth } from '@/lib/hooks';
import { getLessonBySlug } from '@/lib/curriculum';
import { LessonEngine } from '@/components/LessonEngine';

export default function LessonPage() {
  const params = useParams();
  const slug = params.id as string;
  const { isLoading: authLoading } = useRequireAuth();
  const lesson = getLessonBySlug(slug);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-paper dark:bg-paper-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-paper dark:bg-paper-dark flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-5xl mb-4">🤔</p>
          <p className="text-stone-600 dark:text-stone-400 text-lg mb-6">Lesson not found</p>
          <Link
            href="/lessons"
            className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-2xl"
          >
            Back to lessons
          </Link>
        </div>
      </div>
    );
  }

  return <LessonEngine lesson={lesson} mode="lesson" />;
}
