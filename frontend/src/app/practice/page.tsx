'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/lib/hooks';
import { api } from '@/lib/api';
import { VocabularyCard } from '@/components/VocabularyCard';

interface ReviewItem {
  id: string;
  vocabularyId: string;
  spanish: string;
  english: string[];
  audioUrl?: string;
  nextReviewAt: string;
  reps: number;
  state: string;
  masteryConfidence: number;
}

export default function PracticePage() {
  const { user, isLoading: authLoading } = useRequireAuth();
  const [queue, setQueue] = useState<ReviewItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewedCount, setReviewedCount] = useState(0);

  useEffect(() => {
    if (authLoading || !user) return;

    const fetchQueue = async () => {
      try {
        setLoading(true);
        const response = await api.get('/reviews/queue', { params: { limit: 50 } });
        setQueue(response.data.queue);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load review queue');
      } finally {
        setLoading(false);
      }
    };

    fetchQueue();
  }, [authLoading, user]);

  const handleReview = async (quality: 0 | 1 | 2 | 3 | 4 | 5, responseTime: number) => {
    if (currentIndex >= queue.length) return;

    const currentItem = queue[currentIndex];

    try {
      await api.post(`/reviews/vocabulary/${currentItem.vocabularyId}`, {
        quality,
        responseTimeMs: responseTime,
        context: 'vocab_card',
      });

      setReviewedCount(reviewedCount + 1);
      setCurrentIndex(currentIndex + 1);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit review');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading reviews...</p>
        </div>
      </div>
    );
  }

  const isComplete = currentIndex >= queue.length;
  const currentItem = queue[currentIndex];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <nav className="bg-white dark:bg-slate-800 shadow">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            Aprende Español
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/lessons"
              className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            >
              Lessons
            </Link>
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
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Vocabulary Review</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Strengthen your Spanish through spaced repetition
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 rounded-lg mb-8">
            {error}
          </div>
        )}

        {queue.length === 0 && !isComplete ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg shadow">
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              No vocabulary due for review today!
            </p>
            <p className="text-slate-500 dark:text-slate-500 mt-2">
              Complete more lessons to build your vocabulary.
            </p>
            <Link
              href="/lessons"
              className="inline-block mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
            >
              Go to Lessons
            </Link>
          </div>
        ) : isComplete ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg shadow">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Great work!
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg mb-2">
              You reviewed {reviewedCount} vocabulary words today.
            </p>
            <p className="text-slate-500 dark:text-slate-500 mb-6">
              Come back tomorrow for more reviews.
            </p>
            <Link
              href="/lessons"
              className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
            >
              Back to Lessons
            </Link>
          </div>
        ) : (
          <div>
            {/* Progress */}
            <div className="mb-8 bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Progress: {currentIndex + 1} of {queue.length}
                </span>
                <span className="text-sm font-medium text-blue-600">
                  Reviewed: {reviewedCount}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / queue.length) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Card */}
            <div className="flex justify-center mb-12">
              {currentItem && (
                <VocabularyCard
                  key={currentItem.id}
                  id={currentItem.id}
                  spanish={currentItem.spanish}
                  english={currentItem.english}
                  audioUrl={currentItem.audioUrl}
                  reps={currentItem.reps}
                  masteryConfidence={currentItem.masteryConfidence}
                  onReview={handleReview}
                />
              )}
            </div>

            {/* Keyboard hint */}
            <div className="text-center text-sm text-slate-500 dark:text-slate-500">
              Flip the card and rate how well you knew the answer
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
