'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { loadProfile, type LearnerProfile } from '@/lib/tutor-memory';

/** Friendly relative date for session history ("Today", "Yesterday", "5 days ago"). */
function relativeDate(iso: string): string {
  const then = new Date(iso);
  const days = Math.floor((Date.now() - then.getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return '1 week ago';
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Transparency into the tutor's memory of this specific learner — what Profe
 * has picked up on, and a log of recent sessions. This is the "your tutor is
 * personal to you" proof: it should read differently for every learner.
 */
export function TutorProfilePanel() {
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [openTranscript, setOpenTranscript] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setProfile(loadProfile());
    refresh();
    window.addEventListener('aprende-sync', refresh);
    return () => window.removeEventListener('aprende-sync', refresh);
  }, []);

  const hasContent =
    !!profile && (profile.summary || profile.strengths?.length || profile.weaknesses?.length);
  const history = profile?.history ?? [];
  const visibleHistory = expanded ? history : history.slice(0, 3);

  return (
    <section className="surface p-6 mb-6">
      <div className="flex items-center gap-2.5 mb-1">
        <span className="text-xl" aria-hidden>
          🧑‍🏫
        </span>
        <h2 className="font-display text-2xl font-black text-ink dark:text-white">
          What Profe knows about you
        </h2>
      </div>
      <p className="text-sm text-ink-soft dark:text-stone-400 mb-5">
        Notes your tutor keeps between sessions — this is what makes your Profe different from
        anyone else's.
      </p>

      {!hasContent ? (
        <div className="rounded-2xl bg-brand-500/10 border border-brand-500/20 p-5 text-center">
          <p className="text-sm text-ink-soft dark:text-stone-300">
            No notes yet — Profe learns about you as you talk. Have your first call to get started.
          </p>
          <Link
            href="/tutor"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-extrabold text-brand-600 dark:text-brand-400"
          >
            Talk to Profe
            <span aria-hidden>→</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {profile?.summary && (
            <p className="text-[15px] text-ink dark:text-stone-100 leading-relaxed italic">
              “{profile.summary}”
            </p>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            {profile?.strengths && profile.strengths.length > 0 && (
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-brand-600 dark:text-brand-400 mb-2">
                  You're solid on
                </p>
                <ul className="space-y-1.5">
                  {profile.strengths.map((s, i) => (
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

            {profile?.weaknesses && profile.weaknesses.length > 0 && (
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-terra-500 mb-2">
                  Working on
                </p>
                <ul className="space-y-1.5">
                  {profile.weaknesses.map((w, i) => (
                    <li key={i} className="flex gap-2 text-sm text-ink dark:text-stone-200">
                      <span className="text-terra-500 shrink-0" aria-hidden>
                        ◐
                      </span>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {history.length > 0 && (
            <div className="pt-4 border-t border-stone-100 dark:border-stone-800">
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink-soft dark:text-stone-400 mb-3">
                Recent sessions
              </p>
              <ul className="space-y-3">
                {visibleHistory.map((h, i) => {
                  const isOpen = openTranscript === h.date;
                  return (
                    <li key={i}>
                      <div className="flex gap-3 text-sm">
                        <span className="shrink-0 text-ink-soft/70 dark:text-stone-500 text-xs font-semibold w-20 pt-0.5">
                          {relativeDate(h.date)}
                        </span>
                        <span className="text-ink dark:text-stone-200 leading-snug flex-1">
                          {h.wasEvaluation && (
                            <span className="mr-1.5 inline-block text-[10px] font-extrabold uppercase tracking-wide text-saffron-600 dark:text-saffron-400">
                              Check-in
                            </span>
                          )}
                          {h.note}
                          {h.transcript && h.transcript.length > 0 && (
                            <button
                              onClick={() => setOpenTranscript(isOpen ? null : h.date)}
                              className="ml-2 text-xs font-bold text-brand-600 dark:text-brand-400 whitespace-nowrap"
                            >
                              {isOpen ? 'Hide transcript' : 'View transcript'}
                            </button>
                          )}
                        </span>
                      </div>

                      {isOpen && h.transcript && (
                        <div className="mt-2 ml-[92px] max-h-72 overflow-y-auto rounded-xl bg-paper dark:bg-paper-dark border border-stone-100 dark:border-stone-800 p-3 space-y-2">
                          {h.transcript.map((turn, ti) => (
                            <div
                              key={ti}
                              className={`text-[13px] leading-snug ${
                                turn.role === 'user' ? 'text-ink dark:text-stone-200' : 'text-ink-soft dark:text-stone-400'
                              }`}
                            >
                              <span className="font-bold">{turn.role === 'user' ? 'You: ' : 'Profe: '}</span>
                              {turn.content}
                            </div>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              {history.length > 3 && (
                <button
                  onClick={() => setExpanded((e) => !e)}
                  className="mt-3 text-xs font-bold text-brand-600 dark:text-brand-400"
                >
                  {expanded ? 'Show less' : `Show ${history.length - 3} more`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
