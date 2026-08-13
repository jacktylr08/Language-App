'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons/Icon';
import {
  getActiveLanguage,
  getAvailableLanguages,
  setActiveLanguageId,
  hasLanguageChoice,
  LANGUAGE_CHANGE_EVENT,
  type CourseLanguage,
} from '@/lib/languages';
import { feedback } from '@/lib/feedback';

/**
 * Switching between courses.
 *
 * This sits where the course badge already sat — next to the wordmark in the
 * nav bar — because that badge was already answering "which course am I in?",
 * and the switcher is the same question with an answer you can change. Putting
 * it behind Settings would make changing course feel like an administrative
 * act rather than something you do because you fancy some Italian tonight.
 *
 * Nothing here touches progress. Each course keeps its own progress, tutor
 * memory and word-scheduling under its own storage key (see keys.ts), so
 * switching is genuinely just a change of view: your Spanish streak, words and
 * lessons are exactly where you left them when you come back, and the same is
 * true in the other direction. That is worth saying out loud in the UI, which
 * is why the sheet says it rather than assuming people will trust it.
 *
 * It renders as a plain badge — not a button — when only one course exists, so
 * a learner is never offered a menu with one item in it.
 */
export function CourseSwitcher() {
  const [language, setLanguage] = useState<CourseLanguage>(() => getActiveLanguage());
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const refresh = (): void => setLanguage(getActiveLanguage());
    window.addEventListener(LANGUAGE_CHANGE_EVENT, refresh);
    return () => window.removeEventListener(LANGUAGE_CHANGE_EVENT, refresh);
  }, []);

  // Escape closes, and focus lands somewhere sensible when it opens.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const courses = getAvailableLanguages();

  if (!hasLanguageChoice()) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/5 dark:bg-white/10 px-2.5 py-1 text-xs font-bold text-ink-soft dark:text-stone-300">
        <span aria-hidden>{language.flag}</span>
        {language.nativeName}
      </span>
    );
  }

  const choose = (id: string): void => {
    if (id === language.id) {
      setOpen(false);
      return;
    }
    setActiveLanguageId(id);
    feedback('streak');
    // A hard navigation, deliberately, rather than a client-side route change.
    //
    // Changing course changes the answer to almost every question the app
    // asks: the curriculum, the vocabulary, the reading passages, the tutor's
    // memory and the progress store all move at once. Dozens of components
    // read those at mount and cache them in state, and the first attempt at
    // this — dispatching a change event and letting listeners re-read — left
    // the dashboard showing "The road to Spanish", a Spanish lesson list and a
    // Spanish streak under an Italian flag. Making every one of those
    // consumers reactive is a large refactor with a permanent risk of missing
    // one, and a half-switched screen is far worse than a reload.
    //
    // Switching course is rare and deliberate, so a clean reload is the right
    // trade: it guarantees every module re-reads, with no possibility of two
    // languages on screen at once.
    window.location.assign('/lessons');
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Course: ${language.name}. Change course.`}
        className="inline-flex items-center gap-1.5 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 px-2.5 py-1 text-xs font-bold text-ink-soft dark:text-stone-300 transition-colors"
      >
        <span aria-hidden>{language.flag}</span>
        {language.nativeName}
        <Icon name="chevron-down" size={13} className="opacity-60" />
      </button>

      {/* Portalled to <body> on purpose. This button lives inside a sticky nav
          that uses backdrop-blur, and a backdrop-filter establishes a
          containing block for fixed-position descendants — so `fixed inset-0`
          rendered in place is positioned against the NAV, not the viewport,
          and the sheet ends up off-screen. Nothing about the markup looks
          wrong; it just silently lands in the wrong place. */}
      {open && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Choose a course"
        >
          <button
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fade-in"
          />
          <div className="relative w-full sm:max-w-sm bg-paper dark:bg-paper-dark rounded-t-3xl sm:rounded-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-card-hover animate-rise-in">
            <div className="flex items-start justify-between mb-1">
              <h2 className="font-display text-2xl font-black text-ink dark:text-white">
                Your courses
              </h2>
              <button
                ref={closeRef}
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="-mr-1 -mt-1 p-2 text-stone-400 hover:text-ink dark:hover:text-white transition-colors"
              >
                <Icon name="close" size={20} />
              </button>
            </div>
            {/* The reassurance is the point. Anyone with a streak worth having
                hesitates before tapping something that might reset it. */}
            <p className="text-sm text-ink-soft dark:text-stone-400 mb-4">
              Switch any time — each course keeps its own progress, streak and tutor. Nothing is
              lost either way.
            </p>

            <div className="space-y-2">
              {courses.map((c) => {
                const active = c.id === language.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => choose(c.id)}
                    aria-current={active ? 'true' : undefined}
                    className={`w-full flex items-center gap-3 rounded-2xl p-3.5 text-left transition-colors ${
                      active
                        ? 'bg-brand-500/10 border-2 border-brand-500'
                        : 'surface border-2 border-transparent hover:bg-stone-50 dark:hover:bg-stone-800/60'
                    }`}
                  >
                    <span className="text-2xl shrink-0" aria-hidden>
                      {c.flag}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-extrabold text-ink dark:text-white">
                        {c.name}
                      </span>
                      <span className="block text-xs text-ink-soft dark:text-stone-400">
                        {c.nativeName} · {c.greeting}
                      </span>
                    </span>
                    {active ? (
                      <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wide text-brand-600 dark:text-brand-400">
                        <Icon name="check" size={15} />
                        Current
                      </span>
                    ) : (
                      <Icon
                        name="arrow-right"
                        size={17}
                        className="shrink-0 text-stone-300 dark:text-stone-600"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
