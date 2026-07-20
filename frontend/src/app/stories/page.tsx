'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/lib/hooks';
import { api } from '@/lib/api';

interface Story {
  id: string;
  title: string;
  description?: string;
  difficulty_level: number;
  reading_time_minutes?: number;
  theme?: string;
  published: boolean;
}

export default function StoriesPage() {
  const { user, isLoading: authLoading } = useRequireAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [difficulty, setDifficulty] = useState<number | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;

    const fetchStories = async () => {
      try {
        setLoading(true);
        // This endpoint would be implemented in the backend
        // For now, show placeholder
        setStories([
          {
            id: '1',
            title: 'A Day in Madrid',
            description: 'A beginner story about a day in the Spanish capital',
            difficulty_level: 1,
            reading_time_minutes: 5,
            theme: 'travel',
            published: true,
          },
          {
            id: '2',
            title: 'At the Market',
            description: 'Learn about Spanish food and market culture',
            difficulty_level: 1,
            reading_time_minutes: 6,
            theme: 'food',
            published: true,
          },
        ]);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load stories');
      } finally {
        setLoading(false);
      }
    };

    fetchStories();
  }, [authLoading, user]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-stone-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-900">
      <nav className="bg-white dark:bg-stone-800 shadow">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            Aprende Español
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/lessons"
              className="text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white"
            >
              Lessons
            </Link>
            <Link
              href="/practice"
              className="text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white"
            >
              Practice
            </Link>
            <button
              onClick={() => {
                localStorage.removeItem('language-app-auth');
                window.location.href = '/login';
              }}
              className="px-4 py-2 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-stone-900 dark:text-white mb-4">Spanish Stories</h1>
          <p className="text-stone-600 dark:text-stone-400">
            Improve your reading comprehension through authentic stories
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 rounded-lg mb-8">
            {error}
          </div>
        )}

        {/* Difficulty filter */}
        <div className="mb-8 flex gap-2">
          <button
            onClick={() => setDifficulty(null)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              difficulty === null
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700'
            }`}
          >
            All Levels
          </button>
          {[1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              onClick={() => setDifficulty(level)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                difficulty === level
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700'
              }`}
            >
              Level {level}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-stone-600">Loading stories...</p>
          </div>
        ) : stories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-stone-600 dark:text-stone-400">No stories available yet</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stories
              .filter((story) => difficulty === null || story.difficulty_level === difficulty)
              .map((story) => (
                <div
                  key={story.id}
                  className="bg-white dark:bg-stone-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
                >
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-stone-900 dark:text-white mb-2">
                      {story.title}
                    </h3>

                    <p className="text-stone-600 dark:text-stone-400 text-sm mb-4">
                      {story.description || 'A story in Spanish'}
                    </p>

                    <div className="flex justify-between text-sm text-stone-500 dark:text-stone-400 mb-4">
                      <span>Level {story.difficulty_level}</span>
                      {story.reading_time_minutes && (
                        <span>~{story.reading_time_minutes} min</span>
                      )}
                    </div>

                    {story.theme && (
                      <div className="mb-4">
                        <span className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 text-xs px-2 py-1 rounded capitalize">
                          {story.theme}
                        </span>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        // Navigate to story reader
                        // window.location.href = `/stories/${story.id}`;
                      }}
                      className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      Read Story
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </main>
    </div>
  );
}
