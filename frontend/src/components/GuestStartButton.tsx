'use client';

import { useRouter } from 'next/navigation';
import { beginGuest } from '@/lib/guest';
import { primeAudio } from '@/lib/feedback';
import { getCurriculum } from '@/lib/curriculum';
import { getStartingLesson } from '@/lib/course-progress';
import { loadProgress } from '@/lib/progress';

/**
 * "Try a lesson — no signup."
 *
 * Sends a visitor straight into the first lesson with no account. Progress
 * accumulates locally exactly as it does for a signed-in learner; it simply
 * isn't synced until there's an account to sync to.
 *
 * The tap also primes the AudioContext, since browsers only allow one to
 * start inside a real gesture — otherwise the first correct answer of
 * someone's very first lesson would be silent.
 */
export function GuestStartButton({
  children,
  className = '',
  href,
}: {
  children: React.ReactNode;
  className?: string;
  /** Overrides the resolved starting lesson. Omit it in almost every case. */
  href?: string;
}) {
  const router = useRouter();
  return (
    <button
      onClick={() => {
        beginGuest();
        primeAudio();
        // The default used to be the literal slug 'greetings-essentials'.
        // Resolving it from the curriculum keeps this button correct when the
        // course is reordered, a lesson is renamed, or the active language
        // changes — cases where the old default silently 404'd.
        const target = href ?? (() => {
          const first = getStartingLesson(getCurriculum(), loadProgress());
          return first ? `/lessons/${first.slug}` : '/lessons';
        })();
        router.push(target);
      }}
      className={className}
    >
      {children}
    </button>
  );
}
