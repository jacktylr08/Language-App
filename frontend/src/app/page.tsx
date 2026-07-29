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

/**
 * The welcome screen.
 *
 * This was a marketing website: a sticky nav bar with "Sign in / Get started"
 * in the corner, a hero, a features grid, a phases grid and a footer — the
 * shape of a page you land on from a search result. That's the wrong object.
 * Fluenta is an app, and an app's first screen is a door, not a brochure:
 * brand, one question, a couple of buttons, full height, no chrome.
 *
 * So it's one screen at a time. Pick a language, then choose how to start.
 * Nothing to scroll past to reach what you came for, no nav bar competing with
 * the primary action, no footer.
 *
 * Opening on "what do you want to learn?" is also the framing that makes this
 * a language app rather than a Spanish app — see LanguagePicker.
 */

type Step = 'language' | 'start';

const SELLING_POINTS: ReadonlyArray<readonly [IconName, string]> = [
  ['chat', 'Unlimited spoken conversation'],
  ['refresh', 'Reviews timed to just before you forget'],
  ['grammar', 'Grammar explained, not just marked wrong'],
];

export default function WelcomePage() {
  const router = useRouter();
  const { isLoading } = useRedirectIfAuthenticated();
  const [step, setStep] = useState<Step>('language');
  const [languageName, setLanguageName] = useState('');

  if (isLoading) return <PageSkeleton />;

  const lessonCount = getCurriculum().length;

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
          <Link
            href="/login"
            className="shrink-0 text-center py-3 text-sm font-bold text-ink-soft dark:text-stone-400 hover:text-ink dark:hover:text-white"
          >
            I already have an account
          </Link>
        </div>
      ) : (
        <div className="flex-1 flex flex-col max-w-sm w-full mx-auto animate-rise-in">
          <button
            onClick={() => setStep('language')}
            className="shrink-0 self-start -ml-2 p-2 text-ink-soft dark:text-stone-400 hover:text-ink dark:hover:text-white"
            aria-label="Back to language choice"
          >
            <Icon name="arrow-left" size={22} />
          </button>

          <div className="flex-1 flex flex-col justify-center text-center py-4">
            <Profe mood="speaking" size={128} className="mx-auto mb-4" />
            <h1 className="font-display text-4xl font-black text-ink dark:text-white leading-[1.05]">
              Stop tapping.
              <br />
              <span className="text-brand-600 dark:text-brand-400">Start talking.</span>
            </h1>
            <p className="text-ink-soft dark:text-stone-400 mt-4 leading-relaxed">
              Call Profe and just talk {languageName}. He speaks at your exact level, lets you
              finish your sentence, and remembers what you found hard last time.
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
            <button
              onClick={() => {
                beginGuest();
                // Inside the gesture, or the first correct answer of their
                // first lesson plays into a suspended AudioContext.
                primeAudio();
                router.push('/lessons/greetings-essentials');
              }}
              className="btn-primary w-full py-4 text-lg"
            >
              Start your first lesson
            </button>
            <Link
              href="/register"
              className="block w-full py-3 text-center text-sm font-bold text-ink-soft dark:text-stone-400 hover:text-ink dark:hover:text-white"
            >
              Create an account first
            </Link>
            <p className="text-center text-xs text-stone-400 dark:text-stone-600">
              Free. No account needed to start.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
