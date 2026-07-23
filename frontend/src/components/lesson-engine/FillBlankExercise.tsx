import type { Feedback } from './types';
import { optionClasses } from './option-classes';

export function FillBlankExercise({
  sentence,
  options,
  selected,
  feedback,
  onSelect,
}: {
  sentence: { es: string; en: string; blank: string };
  options: string[];
  selected: string | null;
  feedback: Feedback;
  onSelect: (o: string) => void;
}) {
  const parts = sentence.es.split(sentence.blank);
  const shown = feedback || selected ? selected ?? '' : '_____';
  return (
    <div className="flex-1 flex flex-col justify-center">
      <p className="text-center text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-6">
        Complete the sentence
      </p>
      <div className="surface p-6 mb-2 text-center">
        <p className="font-display text-3xl font-black text-ink dark:text-white leading-relaxed">
          {parts[0]}
          <span
            className={`inline-block min-w-[80px] border-b-4 mx-1 px-1 ${
              feedback
                ? feedback.kind === 'correct'
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-terra-400 text-terra-500'
                : 'border-stone-300 dark:border-stone-600 text-stone-400'
            }`}
          >
            {shown}
          </span>
          {parts[1]}
        </p>
      </div>
      <p className="text-center text-sm text-stone-500 dark:text-stone-400 mb-6 italic">
        &ldquo;{sentence.en}&rdquo;
      </p>
      <div className="grid grid-cols-2 gap-3">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onSelect(option)}
            disabled={!!feedback}
            className={optionClasses(option, selected, feedback, sentence.blank)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
