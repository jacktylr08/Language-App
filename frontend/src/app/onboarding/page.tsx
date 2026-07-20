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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto"></div>
          <p className="mt-4 text-stone-600">Loading...</p>
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl surface !rounded-[28px] p-8">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-stone-600 dark:text-stone-400">
              Step {step + 1} of 4
            </span>
          </div>
          <div className="w-full bg-stone-200 dark:bg-stone-700 rounded-full h-2">
            <div
              className="progress-shimmer h-2 rounded-full transition-all duration-300"
              style={{ width: `${((step + 1) / 4) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Step content */}
        <div className="mb-8 min-h-64">
          {step === 0 && (
            <div className="text-center">
              <h1 className="font-display text-4xl font-black text-ink dark:text-white mb-4">
                Welcome, {user?.email}!
              </h1>
              <p className="text-lg text-stone-600 dark:text-stone-400 mb-6">
                Let's set up your Spanish learning journey.
              </p>
              <div className="rounded-2xl bg-brand-500/10 border border-brand-500/20 p-6">
                <p className="text-stone-700 dark:text-stone-300">
                  This app teaches you Spanish through comprehensible input, spaced repetition, and
                  real conversation. No gamification, just genuine learning.
                </p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="font-display text-3xl font-black text-ink dark:text-white mb-6">
                What's your goal?
              </h2>
              <div className="space-y-3">
                {[
                  { value: 'conversation', label: 'Have conversations in Spanish' },
                  { value: 'travel', label: 'Prepare for travel' },
                  { value: 'culture', label: 'Understand Spanish culture' },
                  { value: 'general', label: 'General learning' },
                ].map((option) => (
                  <label key={option.value} className="flex items-center p-4 border-2 border-stone-200 dark:border-stone-600 rounded-lg cursor-pointer hover:border-brand-400 hover:bg-brand-50/50 dark:hover:bg-stone-800 transition-colors">
                    <input
                      type="radio"
                      name="goal"
                      value={option.value}
                      className="w-4 h-4 accent-brand-600"
                    />
                    <span className="ml-3 text-stone-700 dark:text-stone-300 font-medium">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="font-display text-3xl font-black text-ink dark:text-white mb-6">
                Your learning preferences
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
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
                  <p className="text-xs text-stone-500 mt-2">
                    How many vocabulary words to review each day
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
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
                    className="w-full px-4 py-2 border border-stone-300 dark:border-stone-600 rounded-lg dark:bg-stone-700"
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
              <h2 className="font-display text-3xl font-black text-ink dark:text-white mb-6">
                You're ready to start!
              </h2>
              <div className="rounded-2xl bg-brand-500/10 border border-brand-500/20 p-6 mb-6">
                <p className="text-brand-700 dark:text-brand-200 font-bold">
                  ✓ Your learning space is set up
                </p>
                <p className="text-brand-700/80 dark:text-brand-200/80 text-sm mt-2">
                  You'll start with our Foundation phase, learning through listening and
                  comprehension.
                </p>
              </div>
              <div className="text-stone-600 dark:text-stone-400 text-sm space-y-2">
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
            className="flex-1 py-3 px-4 rounded-2xl border-2 border-stone-200 dark:border-stone-700 text-ink-soft dark:text-stone-300 font-extrabold hover:border-stone-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleNext}
            className="flex-1 btn-primary py-3"
          >
            {step === 3 ? 'Start Learning' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
