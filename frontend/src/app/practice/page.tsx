'use client';

import { useRequireAuth } from '@/lib/hooks';
import { LessonEngine } from '@/components/LessonEngine';

export default function PracticePage() {
  const { isLoading: authLoading } = useRequireAuth();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return <LessonEngine lesson={null} mode="practice" />;
}
