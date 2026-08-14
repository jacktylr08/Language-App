'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/lib/hooks';
import { markOnboardingComplete } from '@/lib/sync';
import { saveLearnerGoal, GOAL_LABELS, type LearnerGoal } from '@/lib/learner-goal';
import {
  LEVEL_OPTIONS,
  startWeekForLevel,
  PLACEMENT_QUIZ_LENGTH,
  buildPlacementQuestionPool,
  initialPlacementProgress,
  pickNextPlacementQuestion,
  recordPlacementAnswer,
  isPlacementQuizComplete,
  startWeekForPlacement,
  type LearnerLevel,
  type PlacementQuestion,
  type PlacementProgress,
} from '@/lib/placement';
import { placeLearnerAtWeek } from '@/lib/progress';
import { phaseForWeek } from '@/lib/curriculum';
import { TasteOfSpanish } from '@/components/onboarding/TasteOfSpanish';
import { PageSkeleton } from '@/components/Skeleton';
import { getActiveLanguage } from '@/lib/languages';

const GOAL_OPTIONS = Object.entries(GOAL_LABELS) as Array<[LearnerGoal, string]>;
const TOTAL_STEPS = 4;

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoading } = useRequireAuth();
  const [step, setStep] = useState(0);
  const [level, setLevel] = useState<LearnerLevel | null>(null);
  const [goal, setGoal] = useState<LearnerGoal | null>(null);

  // The placement diagnostic — only entered if the learner says they've
  // studied some Spanish already. A true complete beginner skips it entirely
  // and starts at week 1, since a 10-question quiz would just be friction
  // before their first real lesson.
  const questionPool = useMemo(() => buildPlacementQuestionPool(), []);
  const [quizProgress, setQuizProgress] = useState<PlacementProgress | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<PlacementQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [revealResult, setRevealResult] = useState<boolean | null>(null);
  // The actual, decided starting week — either from the quiz result or the
  // complete-beginner fast path. This (not the raw self-report) is what
  // actually gets used to place the learner.
  const [startWeek, setStartWeek] = useState<number | null>(null);

  if (isLoading) {
    return <PageSkeleton />;
  }

  const beginQuiz = () => {
    const progress = initialPlacementProgress();
    setQuizProgress(progress);
    setCurrentQuestion(pickNextPlacementQuestion(questionPool, progress));
    setSelectedOption(null);
    setRevealResult(null);
  };

  const chooseLevel = (value: LearnerLevel) => {
    setLevel(value);
    if (value === 'new') {
      setStartWeek(startWeekForLevel('new'));
      setQuizProgress(null);
      setCurrentQuestion(null);
    } else {
      setStartWeek(null);
      beginQuiz();
    }
  };

  const answerQuizQuestion = (option: string) => {
    if (!quizProgress || !currentQuestion || selectedOption) return;
    const wasCorrect = option === currentQuestion.correctAnswer;
    setSelectedOption(option);
    setRevealResult(wasCorrect);

    const nextProgress = recordPlacementAnswer(quizProgress, currentQuestion, wasCorrect);
    setQuizProgress(nextProgress);

    // Brief pause so the learner sees whether they got it right before the
    // next question appears — same "graded, then move on" rhythm as a lesson.
    setTimeout(() => {
      if (isPlacementQuizComplete(nextProgress)) {
        setStartWeek(startWeekForPlacement(nextProgress));
        setCurrentQuestion(null);
      } else {
        setCurrentQuestion(pickNextPlacementQuestion(questionPool, nextProgress));
      }
      setSelectedOption(null);
      setRevealResult(null);
    }, 700);
  };

  const quizInProgress = quizProgress !== null && !isPlacementQuizComplete(quizProgress);
  const readyToAdvancePastLevel = startWeek !== null && !quizInProgress;

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      // Persist what they told us — Profe uses this to shape the conversation
      // (see lib/learner-goal.ts) — and remember onboarding is done so it
      // never re-asks. Both are synced to the account.
      if (goal) saveLearnerGoal(goal);
      // The learner's ACTUAL demonstrated starting week — from the adaptive
      // quiz when they took one, or the complete-beginner fast path
      // otherwise. Earlier lessons are marked `skipped`, never faked as
      // `completed`: they still unlock everything and set the tutor's level
      // ceiling, but the lesson list stays honest that this material was
      // never actually done in the app.
      if (startWeek) placeLearnerAtWeek(startWeek);
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
      <div className={`w-full surface !rounded-[28px] p-8 ${step === 0 ? 'max-w-md' : 'max-w-2xl'}`}>
        {/* Progress bar — hidden on the first screen, which is a taste of the
            app rather than a form step. "Step 1 of 4" above a demo frames it
            as paperwork. */}
        <div className={`mb-8 ${step === 0 ? 'hidden' : ''}`}>
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
          {step === 0 && <TasteOfSpanish onSolved={() => setStep(1)} />}

          {step === 1 && !quizProgress && (
            <div>
              <h2 className="font-display text-3xl font-black text-ink dark:text-white mb-2">
                What&rsquo;s your {getActiveLanguage().name} level?
              </h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">
                If you've studied before, we'll follow up with a quick 10-question check — not an
                exam, just enough to place you accurately instead of guessing.
              </p>
              <div className="space-y-3">
                {LEVEL_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      level === opt.value
                        ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-500/10'
                        : 'border-stone-200 dark:border-stone-600 hover:border-brand-400 hover:bg-brand-50/50 dark:hover:bg-stone-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="level"
                      value={opt.value}
                      checked={level === opt.value}
                      onChange={() => chooseLevel(opt.value)}
                      className="w-4 h-4 accent-brand-600 mt-1"
                    />
                    <span>
                      <span className="block text-stone-700 dark:text-stone-300 font-bold">
                        {opt.label}
                      </span>
                      <span className="block text-sm text-stone-500 dark:text-stone-400 mt-0.5">
                        {opt.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 1 && quizProgress && quizInProgress && currentQuestion && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-display text-2xl font-black text-ink dark:text-white">
                  Quick placement check
                </h2>
                <span className="text-sm font-medium text-stone-500 dark:text-stone-400">
                  {quizProgress.history.length + 1} / {PLACEMENT_QUIZ_LENGTH}
                </span>
              </div>
              <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">
                Answer as best you can — questions get harder or easier depending on how you do, so
                don't worry about missing one.
              </p>
              <p className="text-lg font-bold text-stone-700 dark:text-stone-200 mb-4">
                {currentQuestion.prompt}
              </p>
              <div className="space-y-3">
                {currentQuestion.options.map((opt) => {
                  const isSelected = selectedOption === opt;
                  const isCorrectOption = opt === currentQuestion.correctAnswer;
                  const showState = selectedOption !== null;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => answerQuizQuestion(opt)}
                      disabled={selectedOption !== null}
                      className={`w-full text-left p-4 border-2 rounded-lg transition-colors ${
                        showState && isCorrectOption
                          ? 'border-green-500 bg-green-50/60 dark:bg-green-500/10'
                          : showState && isSelected && !isCorrectOption
                            ? 'border-red-500 bg-red-50/60 dark:bg-red-500/10'
                            : 'border-stone-200 dark:border-stone-600 hover:border-brand-400 hover:bg-brand-50/50 dark:hover:bg-stone-800'
                      }`}
                    >
                      <span className="text-stone-700 dark:text-stone-300 font-medium">{opt}</span>
                    </button>
                  );
                })}
              </div>
              {revealResult !== null && (
                <p
                  className={`mt-4 text-sm font-bold ${revealResult ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                >
                  {revealResult ? 'Correct!' : `Not quite — "${currentQuestion.correctAnswer}"`}
                </p>
              )}
            </div>
          )}

          {step === 1 && quizProgress && !quizInProgress && startWeek !== null && (
            <div className="text-center">
              <h2 className="font-display text-2xl font-black text-ink dark:text-white mb-4">
                Quick check complete!
              </h2>
              <p className="text-stone-600 dark:text-stone-400">
                Based on your answers, we've found the right starting point for you.
              </p>
            </div>
          )}

          {step === 2 && (
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

          {step === 3 && (() => {
            const week = startWeek ?? 1;
            const phase = phaseForWeek(week);
            const isPlaced = week > 1;
            return (
              <div className="text-center">
                <h2 className="font-display text-3xl font-black text-ink dark:text-white mb-6">
                  You're ready to start!
                </h2>
                <div className="rounded-2xl bg-brand-500/10 border border-brand-500/20 p-6 mb-6">
                  <p className="text-brand-700 dark:text-brand-200 font-bold">
                    ✓ Your learning space is set up
                  </p>
                  <p className="text-brand-700/80 dark:text-brand-200/80 text-sm mt-2">
                    {isPlaced
                      ? `You'll start at Phase ${phase.number}: ${phase.title} (${phase.subtitle.toLowerCase()}) — everything earlier is marked as placed out of, not completed, so you can always go back and brush up if something feels shaky.`
                      : "You'll start with our Foundation phase, learning through listening and comprehension."}
                  </p>
                </div>
                <div className="text-stone-600 dark:text-stone-400 text-sm space-y-2">
                  <p>• Lessons designed to build comprehension</p>
                  <p>• Vocabulary automatically added to your spaced repetition</p>
                  <p>• A live tutor who remembers you and adapts to your goal and level</p>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Navigation — the first screen drives itself. */}
        <div className={`flex gap-4 ${step === 0 ? 'hidden' : ''}`}>
          <button
            onClick={handlePrevious}
            disabled={step === 0}
            className="flex-1 py-3 px-4 rounded-2xl border-2 border-stone-200 dark:border-stone-700 text-ink-soft dark:text-stone-300 font-extrabold hover:border-stone-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={(step === 1 && !readyToAdvancePastLevel) || (step === 2 && !goal)}
            className="flex-1 btn-primary py-3 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {step === TOTAL_STEPS - 1 ? 'Start Learning' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
