'use client';

import { useRouter } from 'next/navigation';
import { beginGuest } from '@/lib/guest';
import { primeAudio } from '@/lib/feedback';

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
  href = '/lessons/greetings-essentials',
}: {
  children: React.ReactNode;
  className?: string;
  href?: string;
}) {
  const router = useRouter();
  return (
    <button
      onClick={() => {
        beginGuest();
        primeAudio();
        router.push(href);
      }}
      className={className}
    >
      {children}
    </button>
  );
}
