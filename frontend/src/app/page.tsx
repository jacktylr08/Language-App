'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BrandMark } from '@/components/icons/BrandMark';
import { Profe } from '@/components/Profe';
import { Icon, type IconName } from '@/components/icons/Icon';
import { LanguagePicker } from '@/components/LanguagePicker';
import { useRedirectIfAuthenticated } from '@/lib/hooks';
import { PageSkeleton } from '@/components/Skeleton';
import { beginGuest } from '@/lib/guest';
import { primeAudio } from '@/lib/feedback';
import { getCurriculum } from '@/lib/curriculum';
import { getStartingLesson } from '@/lib/course-progress';
import { loadProgress } from '@/lib/progress';
import { getActiveLanguage, hasLanguageChoice } from '@/lib/languages';

/**
 * The welcome screen.
 *
 * This was a marketing website: a sticky nav bar with "Sign in / Get started"
 * in the corner, a hero, a features grid, a phases grid and a footer — the
 * shape of a page you land on from a search result. That's the wrong object.
 * Fluenta is an app, and an app's first screen is a door, not a brochure:
 * brand, one question, a couple of buttons, full height, no chrome.
 *
 * Two things it also has to get right, both of which it previously got wrong:
 *
 * 1. It must not promise something the next tap doesn't deliver. The headline
 *    was "Stop tapping. Start talking." above a button reading "Start your
 *    first lesson" — which opens a tapping lesson. Whatever you think of the
 *    lesson, that sequence teaches a new user to discount everything else the
 *    screen says. The pitch is now the actual loop: learn a handful of words,
 *    then use them out loud with Profe. Both halves are true, in that order.
 *
 * 2. It must not sell breadth it doesn't have. Asking "what do you want to
 *    learn?" when one course exists is a menu of one — see hasLanguageChoice.
 *    The step comes back by itself once a second course is finished.
 */

type Step = 'language' | 'start';

const SELLING_POINTS: ReadonlyArray<readonly [IconName, string]> = [
  ['chat', 'Say it out loud to Profe, as much as you like'],
  ['refresh', 'Reviews timed to just before you forget'],
  ['grammar', 'Grammar explained, not just marked wrong'],
];

export default function WelcomePage() {
  const router = useRouter();
  const { isLoading } = useRedirectIfAuthenticated();
  // Straight to the pitch while there's only one course to pitch.
  const [step, setStep] = useState<Step>(() => (hasLanguageChoice() ? 'language' : 'start'));
  const [languageName, setLanguageName] = useState(() => getActiveLanguage().name);

  if (isLoading) return <PageSkeleton />;

  const curriculum = getCurriculum();
  const lessonCount = curriculum.length;

  const startLearning = (): void => {
    beginGuest();
    // Inside the gesture, or the first correct answer of their first lesson
    // plays into a suspended AudioContext.
    primeAudio();
    // Resolved from the curriculum, never a hard-coded slug: this button has
    // to stay correct across renames, reorderings, and a second language
    // whose first lesson isn't called the same thing.
    const first = getStartingLesson(curriculum, loadProgress());
    router.push(first ? `/lessons/${first.slug}` : '/lessons');
  };

  return (
    // Full viewport and safe-area aware: an installed app has no browser
    // chrome to hide behind, and content under the notch looks broken.
    <div className="min-h-[100dvh] flex flex-col px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      {step === 'language' ? (
        <div className="flex-1 flex flex-col max-w-sm w-full mx-auto animate-rise-in">
          <div className="flex-1 flex flex-col justify-center py-6">
            <BrandMark size={56} className="rounded-[16px] shadow-card mb-6" />
            <h1 className="font-display text-4xl font-black text-ink dark:text-white leading-tight">
              What do you want to learn?
            </h1>
            <p className="text-ink-soft dark:text-stone-400 mt-2 mb-7">
              A real course, with a tutor you can actually talk to.
            </p>
            <LanguagePicker
              onPicked={(language) => {
                setLanguageName(language.name);
                setStep('start');
              }}
            />
          </div>
          <div className="shrink-0">
            <Link
              href="/login"
              className="block text-center py-3 text-sm font-bold text-ink-soft dark:text-stone-400 hover:text-ink dark:hover:text-white"
            >
              I already have an account
            </Link>
            <LegalLinks />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col max-w-sm w-full mx-auto animate-rise-in">
          {hasLanguageChoice() ? (
            <button
              onClick={() => setStep('language')}
              className="shrink-0 self-start -ml-2 p-2 text-ink-soft dark:text-stone-400 hover:text-ink dark:hover:text-white"
              aria-label="Back to language choice"
            >
              <Icon name="arrow-left" size={22} />
            </button>
          ) : (
            <BrandMark size={44} className="shrink-0 rounded-[13px] shadow-card" />
          )}

          <div className="flex-1 flex flex-col justify-center text-center py-4">
            <Profe mood="speaking" size={128} className="mx-auto mb-4" />
            <h1 className="font-display text-4xl font-black text-ink dark:text-white leading-[1.05]">
              Learn it.
              <br />
              <span className="text-brand-600 dark:text-brand-400">Then say it.</span>
            </h1>
            <p className="text-ink-soft dark:text-stone-400 mt-4 leading-relaxed">
              A {languageName} course where every lesson ends somewhere real: talking to Profe, who
              speaks at your exact level, lets you finish your sentence, and remembers what you
              found hard last time.
            </p>

            <ul className="mt-7 space-y-2.5 text-left">
              {SELLING_POINTS.map(([icon, label]) => (
                <li key={label} className="flex items-center gap-3">
                  <span className="shrink-0 w-8 h-8 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400">
                    <Icon name={icon} size={17} />
                  </span>
                  <span className="text-[15px] font-semibold text-ink dark:text-stone-200">
                    {label}
                  </span>
                </li>
              ))}
              <li className="flex items-center gap-3">
                <span className="shrink-0 w-8 h-8 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400">
                  <Icon name="learn" size={17} />
                </span>
                <span className="text-[15px] font-semibold text-ink dark:text-stone-200">
                  {lessonCount} lessons that build up to it
                </span>
              </li>
            </ul>
          </div>

          <div className="shrink-0 space-y-2">
            {/* Says what actually happens next, at the length it actually
                takes. "Start your first lesson" under a headline about talking
                was the mismatch; this names the first step of the loop the
                headline just described. */}
            <button onClick={startLearning} className="btn-primary w-full py-4 text-lg">
              Learn your first words — 3 min
            </button>
            {/* An escape hatch for someone who isn't a beginner. Every guest
                used to be dropped into lesson one regardless, so anyone who
                already knew "hola" met a screen teaching them "hola" and
                concluded the app was beneath them — with no visible way to
                say so. A mandatory level question would tax the majority who
                genuinely are starting from zero, so it's an option here
                rather than a step, leading into the adaptive placement quiz
                that already exists. */}
            <button
              onClick={() => {
                beginGuest();
                primeAudio();
                router.push('/onboarding');
              }}
              className="block w-full py-3 text-center text-sm font-bold text-ink-soft dark:text-stone-400 hover:text-ink dark:hover:text-white"
            >
              I already know some {languageName} — check my level
            </button>
            <Link
              href="/register"
              className="block w-full py-2 text-center text-sm font-bold text-ink-soft dark:text-stone-400 hover:text-ink dark:hover:text-white"
            >
              Create an account
            </Link>
            <p className="text-center text-xs text-stone-400 dark:text-stone-600">
              Free to start, no account needed. An account saves your progress across devices.
            </p>
            <LegalLinks />
          </div>
        </div>
      )}
    </div>
  );
}

/** Both app stores require these to be reachable, and a learner deciding
 *  whether to talk to an AI deserves to find them. */
function LegalLinks() {
  return (
    <p className="text-center text-xs text-stone-400 dark:text-stone-600 pt-2 pb-1">
      <Link href="/privacy" className="hover:underline">
        Privacy
      </Link>
      {' · '}
      <Link href="/terms" className="hover:underline">
        Terms
      </Link>
      {' · '}
      <Link href="/support" className="hover:underline">
        Support
      </Link>
    </p>
  );
}
