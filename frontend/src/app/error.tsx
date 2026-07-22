'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Catches render/runtime errors anywhere under the root layout so a single
 * bad exercise, a malformed curriculum entry, or an unexpected API shape
 * doesn't take the whole app down to a blank screen — the learner gets a
 * recoverable screen instead.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled app error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md p-8 surface !rounded-[28px] text-center">
        <h1 className="font-display text-3xl font-black text-brand-600 dark:text-brand-400 mb-2">
          Something went wrong
        </h1>
        <p className="text-stone-600 dark:text-stone-400 mb-6">
          That's on us, not you — your progress is saved. Try again, or head back to your
          lessons.
        </p>
        <div className="flex flex-col gap-3">
          <button type="button" onClick={() => reset()} className="btn-primary w-full py-3.5">
            Try again
          </button>
          <Link href="/lessons" className="text-brand-600 hover:text-brand-500 dark:text-brand-400 font-semibold">
            Back to lessons
          </Link>
        </div>
      </div>
    </div>
  );
}
