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
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-5xl mb-4">🤔</p>
          <p className="text-slate-600 dark:text-slate-400 text-lg mb-6">Lesson not found</p>
          <Link
            href="/lessons"
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl"
          >
            Back to lessons
          </Link>
        </div>
      </div>
    );
  }

  return <LessonEngine lesson={lesson} mode="lesson" />;
}
