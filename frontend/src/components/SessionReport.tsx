'use client';

import { useEffect, useRef } from 'react';

interface SessionReportProps {
  note?: string;
  mistakes: string[];
  /** Things they did well in THIS session specifically — not the cumulative, ongoing `strengths` list. */
  sessionWins: string[];
  onContinue: () => void;
}

/**
 * The tutor's reflect() call already extracts concrete, specific mistakes
 * ("said 'X', should be 'Y'") every session — previously that data only
 * ever silently biased future prompts and was never actually shown to the
 * learner. This is that missing explicit post-session report.
 */
export function SessionReport({ note, mistakes, sessionWins, onContinue }: SessionReportProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus here on mount so screen-reader users get an announcement —
  // this screen replaces the call UI in place rather than navigating to a
  // new route, so there's no natural focus/announcement point otherwise.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-lg p-8 surface !rounded-[28px]">
        <div className="text-center mb-6">
          <span className="text-3xl" aria-hidden>
            🧑‍🏫
          </span>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-2xl font-black text-ink dark:text-white mt-2 outline-none"
          >
            Session recap
          </h1>
          {note && <p className="text-ink-soft dark:text-stone-400 mt-1 text-sm italic">&ldquo;{note}&rdquo;</p>}
        </div>

        {mistakes.length > 0 && (
          <div className="mb-5">
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-terra-500 mb-2">
              Worth a closer look
            </p>
            <ul className="space-y-2">
              {mistakes.map((m, i) => (
                <li key={i} className="flex gap-2 text-sm text-ink dark:text-stone-200">
                  <span className="text-terra-500 shrink-0" aria-hidden>
                    ◐
                  </span>
                  {m}
                </li>
              ))}
            </ul>
          </div>
        )}

        {sessionWins.length > 0 && (
          <div className="mb-6">
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-brand-600 dark:text-brand-400 mb-2">
              You nailed
            </p>
            <ul className="space-y-2">
              {sessionWins.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-ink dark:text-stone-200">
                  <span className="text-brand-500 shrink-0" aria-hidden>
                    ✓
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {mistakes.length === 0 && sessionWins.length === 0 && (
          <p className="text-center text-sm text-ink-soft dark:text-stone-400 mb-6">
            Nice chat — nothing specific to flag this time.
          </p>
        )}

        <button type="button" onClick={onContinue} className="btn-primary w-full py-3.5">
          Continue
        </button>
      </div>
    </div>
  );
}
