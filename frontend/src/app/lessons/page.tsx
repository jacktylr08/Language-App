'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/lib/hooks';
import { api } from '@/lib/api';

interface Lesson {
  id: string;
  title: string;
  description: string;
  level: number;
  curriculum_phase: string;
  content_type: string;
  estimated_duration_minutes: number;
  canStart: boolean;
  unlockReason?: string;
  userProgress?: { status: string };
}

export default function LessonsPage() {
  const { user, isLoading: authLoading } = useRequireAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState('foundation');

  useEffect(() => {
    if (authLoading || !user) return;

    const fetchLessons = async () => {
      try {
        setLoading(true);
        const response = await api.get('/lessons/available', {
          params: { phase },
        });
        setLessons(response.data.lessons);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load lessons');
      } finally {
        setLoading(false);
      }
    };

    fetchLessons();
  }, [authLoading, user, phase]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <nav className="bg-white dark:bg-slate-800 shadow">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            Aprende Español
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-slate-600 dark:text-slate-400">{user?.email}</span>
            <button
              onClick={() => {
                localStorage.removeItem('language-app-auth');
                window.location.href = '/login';
              }}
              className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Spanish Lessons
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Choose a lesson to begin your learning journey
          </p>
        </div>

        {/* Phase selector */}
        <div className="mb-8 flex gap-2">
          {['foundation', 'core', 'conversation', 'real_media'].map((p) => (
            <button
              key={p}
              onClick={() => setPhase(p)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                phase === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1).replace('_', ' ')}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 rounded-lg mb-8">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading lessons...</p>
          </div>
        ) : lessons.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-600 dark:text-slate-400">No lessons available yet</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex-1">
                      {lesson.title}
                    </h3>
                    {lesson.userProgress?.status === 'completed' && (
                      <span className="text-sm bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 px-2 py-1 rounded">
                        ✓ Done
                      </span>
                    )}
                  </div>

                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                    {lesson.description || 'No description'}
                  </p>

                  <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400 mb-4">
                    <span>Level {lesson.level}</span>
                    <span>{lesson.estimated_duration_minutes} min</span>
                  </div>

                  {lesson.canStart ? (
                    <Link
                      href={`/lessons/${lesson.id}`}
                      className="block w-full text-center py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      {lesson.userProgress?.status === 'in_progress' ? 'Continue' : 'Start'}
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="w-full py-2 px-4 bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-400 font-semibold rounded-lg cursor-not-allowed"
                      title={lesson.unlockReason}
                    >
                      {lesson.unlockReason || 'Locked'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
