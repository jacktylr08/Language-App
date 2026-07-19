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
  theme_category?: string;
  week_number?: number;
  canStart: boolean;
  unlockReason?: string;
  userProgress?: { status: string };
}

const themeColors: Record<string, { bg: string; border: string; badge: string; text: string }> = {
  phonetics: {
    bg: 'bg-slate-50 dark:bg-slate-800/50',
    border: 'border-slate-300 dark:border-slate-600',
    badge: 'bg-slate-500 text-white',
    text: 'text-slate-900 dark:text-slate-100',
  },
  verbs: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-300 dark:border-purple-700',
    badge: 'bg-purple-600 text-white',
    text: 'text-purple-900 dark:text-purple-100',
  },
  family: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-300 dark:border-red-700',
    badge: 'bg-red-600 text-white',
    text: 'text-red-900 dark:text-red-100',
  },
  nouns: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-300 dark:border-blue-700',
    badge: 'bg-blue-600 text-white',
    text: 'text-blue-900 dark:text-blue-100',
  },
  adjectives: {
    bg: 'bg-cyan-50 dark:bg-cyan-900/20',
    border: 'border-cyan-300 dark:border-cyan-700',
    badge: 'bg-cyan-600 text-white',
    text: 'text-cyan-900 dark:text-cyan-100',
  },
  review: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-300 dark:border-green-700',
    badge: 'bg-green-600 text-white',
    text: 'text-green-900 dark:text-green-100',
  },
};

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
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg">
            <p className="text-slate-600 dark:text-slate-400 text-lg">No lessons available yet</p>
            <p className="text-slate-500 dark:text-slate-500 text-sm mt-2">Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Group lessons by week */}
            {[1, 2, 3, 4].map((week) => {
              const weekLessons = lessons.filter((l) => l.week_number === week);
              if (weekLessons.length === 0) return null;

              return (
                <div key={week}>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    📚 Week {week}
                  </h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {weekLessons.map((lesson) => {
                      const theme = themeColors[lesson.theme_category || 'phonetics'] || themeColors.phonetics;

                      return (
                        <Link
                          key={lesson.id}
                          href={`/lessons/${lesson.id}`}
                          className={`group rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all border-2 ${theme.bg} ${theme.border}`}
                        >
                          <div className="p-6">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex gap-2 mb-2">
                                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${theme.badge}`}>
                                    {lesson.theme_category?.toUpperCase() || 'LESSON'}
                                  </span>
                                  {lesson.userProgress?.status === 'completed' && (
                                    <span className="px-3 py-1 text-xs font-bold bg-green-500 text-white rounded-full">
                                      ✓ DONE
                                    </span>
                                  )}
                                </div>
                                <h3 className={`text-lg font-bold ${theme.text} group-hover:underline`}>
                                  {lesson.title}
                                </h3>
                              </div>
                            </div>

                            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 line-clamp-2">
                              {lesson.description || 'Learn and practice Spanish'}
                            </p>

                            <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                              <span>🎧 {lesson.estimated_duration_minutes} min</span>
                              <span className="group-hover:text-blue-600 dark:group-hover:text-blue-400 font-semibold">
                                Start →
                              </span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
