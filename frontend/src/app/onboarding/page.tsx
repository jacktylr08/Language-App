'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/lib/hooks';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoading } = useRequireAuth();
  const [step, setStep] = useState(0);
  const [preferences, setPreferences] = useState({
    targetReviewsPerDay: 20,
    audioPlaybackSpeed: 1.0,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      // Start first lesson
      router.push('/lessons');
    }
  };

  const handlePrevious = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Step {step + 1} of 4
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((step + 1) / 4) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Step content */}
        <div className="mb-8 min-h-64">
          {step === 0 && (
            <div className="text-center">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                Welcome, {user?.email}!
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-6">
                Let's set up your Spanish learning journey.
              </p>
              <div className="bg-blue-50 dark:bg-blue-900 p-6 rounded-lg">
                <p className="text-slate-700 dark:text-slate-300">
                  This app teaches you Spanish through comprehensible input, spaced repetition, and
                  real conversation. No gamification, just genuine learning.
                </p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                What's your goal?
              </h2>
              <div className="space-y-3">
                {[
                  { value: 'conversation', label: 'Have conversations in Spanish' },
                  { value: 'travel', label: 'Prepare for travel' },
                  { value: 'culture', label: 'Understand Spanish culture' },
                  { value: 'general', label: 'General learning' },
                ].map((option) => (
                  <label key={option.value} className="flex items-center p-4 border-2 border-slate-200 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-700">
                    <input
                      type="radio"
                      name="goal"
                      value={option.value}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className="ml-3 text-slate-700 dark:text-slate-300 font-medium">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                Your learning preferences
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Target daily reviews: {preferences.targetReviewsPerDay}
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={preferences.targetReviewsPerDay}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        targetReviewsPerDay: parseInt(e.target.value),
                      })
                    }
                    className="w-full"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    How many vocabulary words to review each day
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Audio playback speed: {preferences.audioPlaybackSpeed}x
                  </label>
                  <select
                    value={preferences.audioPlaybackSpeed}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        audioPlaybackSpeed: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700"
                  >
                    <option value={0.75}>0.75x (Slower)</option>
                    <option value={1.0}>1.0x (Normal)</option>
                    <option value={1.25}>1.25x (Faster)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                You're ready to start!
              </h2>
              <div className="bg-green-50 dark:bg-green-900 p-6 rounded-lg mb-6">
                <p className="text-green-900 dark:text-green-100 font-medium">
                  ✓ Your learning space is set up
                </p>
                <p className="text-green-800 dark:text-green-200 text-sm mt-2">
                  You'll start with our Foundation phase, learning through listening and
                  comprehension.
                </p>
              </div>
              <div className="text-slate-600 dark:text-slate-400 text-sm space-y-2">
                <p>• Lessons designed to build comprehension</p>
                <p>• Vocabulary automatically added to your spaced repetition</p>
                <p>• Progress tracked based on real learning</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-4">
          <button
            onClick={handlePrevious}
            disabled={step === 0}
            className="flex-1 py-2 px-4 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleNext}
            className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            {step === 3 ? 'Start Learning' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
