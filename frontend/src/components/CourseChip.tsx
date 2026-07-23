'use client';

import { useEffect, useState } from 'react';
import { getActiveLanguage, LANGUAGE_CHANGE_EVENT, type CourseLanguage } from '@/lib/languages';

/**
 * Small "which course you're in" badge next to the wordmark. Fluenta is
 * built to hold more than one language over time, so every nav bar names
 * the course explicitly rather than assuming Spanish is the only one.
 * Reads the active language live (and re-reads on LANGUAGE_CHANGE_EVENT)
 * rather than a value frozen at first import, so a future language switcher
 * updates this without needing a page reload.
 */
export function CourseChip() {
  const [language, setLanguage] = useState<CourseLanguage>(() => getActiveLanguage());

  useEffect(() => {
    const refresh = () => setLanguage(getActiveLanguage());
    window.addEventListener(LANGUAGE_CHANGE_EVENT, refresh);
    return () => window.removeEventListener(LANGUAGE_CHANGE_EVENT, refresh);
  }, []);

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/5 dark:bg-white/10 px-2.5 py-1 text-xs font-bold text-ink-soft dark:text-stone-300">
      <span aria-hidden>{language.flag}</span>
      {language.nativeName}
    </span>
  );
}
