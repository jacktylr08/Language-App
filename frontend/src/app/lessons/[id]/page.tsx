'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRequireAuth } from '@/lib/hooks';
import { api } from '@/lib/api';
import { AudioPlayer } from '@/components/AudioPlayer';
import { SpeechAudioPlayer } from '@/components/SpeechAudioPlayer';
import { getAudioScript } from '@/lib/audio-scripts';

interface VocabularyItem {
  id: string;
  spanish: string;
  english: string[];
  pronunciation: string;
  category?: string;
}

interface Story {
  id: string;
  title: string;
  content: string;
  word_count: number;
}

interface Lesson {
  id: string;
  title: string;
  description: string;
  audio_url: string;
  audio_duration_seconds: number;
  curriculum_phase?: number;
  week_number?: number;
  theme_category?: string;
  theme_color?: string;
  vocabulary?: VocabularyItem[];
  segments?: Array<{
    id: string;
    spanish_text: string;
    english_text: string;
    start_ms: number;
    end_ms: number;
  }>;
  questions?: Array<{
    id: string;
    question_english: string;
    question_spanish: string;
    question_type: string;
    options?: string[];
  }>;
  stories?: Story[];
}

export default function Phase1LessonPage() {
  const params = useParams();
  const lessonId = params.id as string;
  const { user, isLoading: authLoading } = useRequireAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);
  const [showStory, setShowStory] = useState(true);
  const [vocabularyExpanded, setVocabularyExpanded] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [lessonCompleted, setLessonCompleted] = useState(false);

  const themeColorMap: Record<string, { bg: string; text: string; border: string }> = {
    phonetics: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-900 dark:text-white', border: 'border-slate-400' },
    verbs: { bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-900 dark:text-purple-100', border: 'border-purple-400' },
    family: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-900 dark:text-red-100', border: 'border-red-400' },
    nouns: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-900 dark:text-blue-100', border: 'border-blue-400' },
    adjectives: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-900 dark:text-blue-100', border: 'border-blue-400' },
    review: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-900 dark:text-green-100', border: 'border-green-400' },
  };

  const currentTheme = themeColorMap[lesson?.theme_category || 'phonetics'] || themeColorMap.phonetics;

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
      setLessonCompleted(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to complete lesson');
    }
  };

  const estimateReadingTime = (wordCount: number): string => {
    const wordsPerMinute = 150;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return `${minutes} min read`;
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading lesson...</p>
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
      {/* Header */}
      <nav className="bg-white dark:bg-slate-800 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/lessons" className="text-blue-600 hover:text-blue-700 font-semibold text-sm">
            ← Back to Lessons
          </Link>
          <button
            onClick={() => {
              localStorage.removeItem('language-app-auth');
              window.location.href = '/login';
            }}
            className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-sm"
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {error && (
          <div className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 rounded-lg mb-8">
            {error}
          </div>
        )}

        {lessonCompleted && (
          <div className="p-4 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-100 rounded-lg mb-8">
            ✅ Lesson completed! Great work!
          </div>
        )}

        {/* Lesson Header */}
        <div className={`${currentTheme.bg} rounded-lg p-6 mb-8 border-l-4 ${currentTheme.border}`}>
          {lesson.week_number && (
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">
              Week {lesson.week_number} • Phase {lesson.curriculum_phase}
            </p>
          )}
          <h1 className={`text-4xl font-bold ${currentTheme.text} mb-2`}>{lesson.title}</h1>
          <p className="text-slate-600 dark:text-slate-400">{lesson.description}</p>
        </div>

        {/* SECTION 1: Vocabulary Preview */}
        {lesson.vocabulary && lesson.vocabulary.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
              📚 Vocabulary Preview
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Learn these {lesson.vocabulary.length} words before listening. Tap each word to hear it pronounced.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {lesson.vocabulary.slice(0, 15).map((vocab) => (
                <div
                  key={vocab.id}
                  className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-lg font-semibold text-slate-900 dark:text-white">
                        {vocab.spanish}
                      </p>
                      <p className="text-sm text-slate-500 italic">{vocab.pronunciation}</p>
                    </div>
                    <button className="text-blue-600 hover:text-blue-700 font-bold text-xl">
                      🔊
                    </button>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {vocab.english.join(', ')}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SECTION 2: Audio Listening */}
        {(() => {
          const script = getAudioScript(lesson.title);
          if (script) {
            return (
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                  🎧 Listen
                </h2>
                <SpeechAudioPlayer script={script} />
                <p className="text-xs text-slate-500 mt-4 text-center">
                  💡 Listen multiple times at different speeds. Focus on the sounds, not translation.
                </p>
              </section>
            );
          }
          if (lesson.audio_url) {
            return (
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                  🎧 Listen
                </h2>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg">
                  <AudioPlayer
                    audioUrl={lesson.audio_url}
                    onTimeUpdate={setCurrentTime}
                  />
                </div>
              </section>
            );
          }
          return null;
        })()}

        {/* SECTION 3: Transcript */}
        <section className="mb-12">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors mb-4"
          >
            {showTranscript ? '✓ Hide' : '+ Show'} Transcript
          </button>

          {showTranscript && lesson.segments && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg space-y-6">
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
        </section>

        {/* SECTION 4: Comprehension Questions */}
        {lesson.questions && lesson.questions.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
              ❓ Comprehension Check
            </h2>
            <div className="space-y-6">
              {lesson.questions.map((question, idx) => (
                <div key={question.id} className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
                  <p className="font-semibold text-slate-900 dark:text-white mb-2">
                    {idx + 1}. {question.question_english}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 italic">
                    ({question.question_spanish})
                  </p>

                  {question.question_type === 'multiple_choice' && question.options ? (
                    <div className="space-y-2">
                      {question.options.map((option, optIdx) => (
                        <label key={optIdx} className="flex items-center p-3 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors">
                          <input
                            type="radio"
                            name={`q-${question.id}`}
                            className="mr-3"
                          />
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
          </section>
        )}

        {/* SECTION 5: Story Reading */}
        {lesson.stories && lesson.stories.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
              📖 Story: {lesson.stories[0].title}
            </h2>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {estimateReadingTime(lesson.stories[0].word_count)}
                </span>
                <button
                  onClick={() => setShowStory(!showStory)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                >
                  {showStory ? 'Hide' : 'Show'} Story
                </button>
              </div>

              {showStory && (
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-lg leading-relaxed text-slate-900 dark:text-slate-100 whitespace-pre-wrap font-serif">
                    {lesson.stories[0].content}
                  </p>
                  <p className="text-xs text-slate-500 mt-6 text-center">
                    💡 Tip: Click any Spanish word to see its English meaning
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* SECTION 6: Completion Button */}
        <button
          onClick={handleCompleteLesson}
          disabled={lessonCompleted}
          className={`w-full py-4 px-6 font-bold text-lg rounded-lg transition-colors ${
            lessonCompleted
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {lessonCompleted ? '✅ Lesson Completed' : 'Mark Lesson as Complete'}
        </button>
      </main>
    </div>
  );
}
