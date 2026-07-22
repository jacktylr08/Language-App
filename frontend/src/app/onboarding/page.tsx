'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/lib/hooks';
import { markOnboardingComplete } from '@/lib/sync';
import { saveLearnerGoal, GOAL_LABELS, type LearnerGoal } from '@/lib/learner-goal';

const GOAL_OPTIONS = Object.entries(GOAL_LABELS) as Array<[LearnerGoal, string]>;
const TOTAL_STEPS = 3;

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoading } = useRequireAuth();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<LearnerGoal | null>(null);

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
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      // Persist what they told us — Profe uses this to shape the conversation
      // (see lib/learner-goal.ts) — and remember onboarding is done so it
      // never re-asks. Both are synced to the account.
      if (goal) saveLearnerGoal(goal);
      markOnboardingComplete();
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
              Step {step + 1} of {TOTAL_STEPS}
            </span>
          </div>
          <div className="w-full bg-stone-200 dark:bg-stone-700 rounded-full h-2">
            <div
              className="progress-shimmer h-2 rounded-full transition-all duration-300"
              style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
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
                  real conversation with a personal AI tutor. No gamification, just genuine learning.
                </p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="font-display text-3xl font-black text-ink dark:text-white mb-2">
                What's your goal?
              </h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">
                Profe, your tutor, shapes every conversation around this.
              </p>
              <div className="space-y-3">
                {GOAL_OPTIONS.map(([value, label]) => (
                  <label
                    key={value}
                    className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      goal === value
                        ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-500/10'
                        : 'border-stone-200 dark:border-stone-600 hover:border-brand-400 hover:bg-brand-50/50 dark:hover:bg-stone-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="goal"
                      value={value}
                      checked={goal === value}
                      onChange={() => setGoal(value)}
                      className="w-4 h-4 accent-brand-600"
                    />
                    <span className="ml-3 text-stone-700 dark:text-stone-300 font-medium">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
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
                <p>• A live tutor who remembers you and adapts to your goal</p>
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
            disabled={step === 1 && !goal}
            className="flex-1 btn-primary py-3 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {step === TOTAL_STEPS - 1 ? 'Start Learning' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
