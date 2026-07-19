'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRequireAuth } from '@/lib/hooks';
import { api } from '@/lib/api';
import { AudioPlayer } from '@/components/AudioPlayer';

interface Lesson {
  id: string;
  title: string;
  description: string;
  audio_url: string;
  audio_duration_seconds: number;
  segments: Array<{
    id: string;
    spanish_text: string;
    english_text: string;
    start_ms: number;
    end_ms: number;
  }>;
  questions: Array<{
    id: string;
    question_english: string;
    question_spanish: string;
    question_type: string;
    options?: string[];
  }>;
}

export default function LessonDetailPage() {
  const params = useParams();
  const lessonId = params.id as string;
  const { user, isLoading: authLoading } = useRequireAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (authLoading || !user) return;

    const fetchLesson = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/lessons/${lessonId}`);
        setLesson(response.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load lesson');
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();
  }, [authLoading, user, lessonId]);

  const handleCompleteLesson = async () => {
    try {
      await api.post(`/lessons/${lessonId}/complete`);
      alert('Lesson completed!');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to complete lesson');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading lesson...</p>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <Link href="/lessons" className="text-blue-600 hover:text-blue-700 mb-6 inline-block">
            ← Back to Lessons
          </Link>
          <div className="text-center py-12">
            <p className="text-slate-600 dark:text-slate-400 text-lg">Lesson not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <nav className="bg-white dark:bg-slate-800 shadow">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/lessons" className="text-blue-600 hover:text-blue-700 font-semibold">
            ← Back to Lessons
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
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {error && (
          <div className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 rounded-lg mb-8">
            {error}
          </div>
        )}

        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">{lesson.title}</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">{lesson.description}</p>

        {/* Audio player */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Listen</h2>
          {lesson.audio_url && (
            <AudioPlayer audioUrl={lesson.audio_url} onTimeUpdate={setCurrentTime} />
          )}
        </div>

        {/* Transcript toggle */}
        <div className="mb-8">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            {showTranscript ? 'Hide' : 'Show'} Transcript
          </button>

          {showTranscript && lesson.segments && (
            <div className="mt-6 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg space-y-6">
              {lesson.segments.map((segment) => (
                <div key={segment.id} className="border-l-4 border-blue-600 pl-4">
                  <p className="text-lg font-semibold text-slate-900 dark:text-white italic">
                    "{segment.spanish_text}"
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 mt-2">
                    {segment.english_text}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    {Math.floor(segment.start_ms / 1000)}s - {Math.floor(segment.end_ms / 1000)}s
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comprehension questions */}
        {lesson.questions && lesson.questions.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
              Comprehension Check
            </h2>
            <div className="space-y-6">
              {lesson.questions.map((question, idx) => (
                <div key={question.id} className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
                  <p className="font-semibold text-slate-900 dark:text-white mb-4">
                    {idx + 1}. {question.question_english}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 italic">
                    ({question.question_spanish})
                  </p>

                  {question.question_type === 'multiple_choice' && question.options ? (
                    <div className="space-y-2">
                      {question.options.map((option, optIdx) => (
                        <label key={optIdx} className="flex items-center">
                          <input type="radio" name={`q-${question.id}`} className="mr-2" />
                          <span className="text-slate-700 dark:text-slate-300">{option}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="Your answer..."
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Complete button */}
        <button
          onClick={handleCompleteLesson}
          className="w-full py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-lg transition-colors"
        >
          Mark Lesson as Complete
        </button>
      </main>
    </div>
  );
}
