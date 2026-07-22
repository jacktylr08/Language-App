import { CURRENT_LANGUAGE } from '@/lib/languages';

/**
 * Small "which course you're in" badge next to the wordmark. Fluenta is
 * built to hold more than one language over time, so every nav bar names
 * the course explicitly rather than assuming Spanish is the only one.
 */
export function CourseChip() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/5 dark:bg-white/10 px-2.5 py-1 text-xs font-bold text-ink-soft dark:text-stone-300">
      <span aria-hidden>{CURRENT_LANGUAGE.flag}</span>
      {CURRENT_LANGUAGE.nativeName}
    </span>
  );
}
