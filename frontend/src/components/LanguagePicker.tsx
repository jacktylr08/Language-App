'use client';

import { LANGUAGES, setActiveLanguageId, type CourseLanguage } from '@/lib/languages';
import { getRegisteredCurriculumLanguages, getCurriculumFor } from '@/lib/curriculum';
import { Icon } from '@/components/icons/Icon';
import { feedback } from '@/lib/feedback';

/**
 * "What do you want to learn?"
 *
 * This is the framing change that makes Fluenta a language app rather than a
 * Spanish app. Every competitor opens with this question, and it sets an
 * expectation that the product grows — whereas opening on "Learn Spanish"
 * quietly tells a visitor this is a one-language side project, which is the
 * wrong signal even while Spanish is the only finished course.
 *
 * Unbuilt languages are shown rather than hidden, and honestly labelled. That
 * beats both lying about them and pretending they aren't coming: someone who
 * wants French learns that it's planned instead of bouncing, and someone who
 * wants Spanish sees they've picked the one that's ready.
 */
export function LanguagePicker({
  onPicked,
  className = '',
}: {
  onPicked: (language: CourseLanguage) => void;
  className?: string;
}) {
  // Cross-checked against the curriculum registry, not just the `available`
  // flag — a language can never be offered without content actually behind it.
  const withCourse = new Set(getRegisteredCurriculumLanguages());
  const canStart = (l: CourseLanguage) => l.available && withCourse.has(l.id);

  const ready = LANGUAGES.filter(canStart);
  const soon = LANGUAGES.filter((l) => !canStart(l));

  return (
    <div className={className}>
      <ul className="space-y-2.5">
        {ready.map((language) => (
          <li key={language.id}>
            <button
              onClick={() => {
                feedback('tap');
                setActiveLanguageId(language.id);
                onPicked(language);
              }}
              className="w-full flex items-center gap-4 rounded-2xl border-2 border-stone-200 dark:border-stone-700 bg-white/70 dark:bg-stone-900/40 px-4 py-3.5 text-left transition-all hover:border-brand-400 active:scale-[0.99]"
            >
              <span className="text-[32px] leading-none shrink-0" aria-hidden>
                {language.flag}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-extrabold text-ink dark:text-white">
                  {language.name}
                </span>
                <span className="block text-sm text-ink-soft dark:text-stone-400 truncate">
                  {language.greeting} · {getCurriculumFor(language.id).length} lessons ready
                </span>
              </span>
              <Icon name="arrow-right" size={18} className="shrink-0 text-brand-500" />
            </button>
          </li>
        ))}
      </ul>

      {/*
        Languages without a course are listed but NOT tappable — a control that
        looks like a button and does nothing when pressed is worse than no
        control. Showing them at all is deliberate: someone who came for French
        learns it's planned instead of concluding this is a Spanish-only app,
        and someone who came for Spanish sees they picked the ready one.
      */}
      {soon.length > 0 && (
        <div className="mt-6">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-stone-400 dark:text-stone-600 mb-2.5">
            Courses in the works
          </p>
          <ul className="flex flex-wrap gap-2">
            {soon.map((language) => (
              <li
                key={language.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 dark:border-stone-800 px-3 py-1.5 text-sm text-ink-soft dark:text-stone-500"
              >
                <span aria-hidden>{language.flag}</span>
                {language.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
