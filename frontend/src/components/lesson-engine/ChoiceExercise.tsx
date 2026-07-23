import type { Feedback } from './types';
import { optionClasses } from './option-classes';

export function ChoiceExercise({
  prompt,
  promptLang,
  instruction,
  options,
  selected,
  feedback,
  correctAnswer,
  onSelect,
  onSpeak,
  smallPrompt,
}: {
  prompt: string;
  promptLang: 'es' | 'en';
  instruction: string;
  options: string[];
  selected: string | null;
  feedback: Feedback;
  correctAnswer: string;
  onSelect: (o: string) => void;
  onSpeak?: () => void;
  smallPrompt?: boolean;
}) {
  const promptSize = smallPrompt
    ? 'text-xl leading-snug'
    : 'font-display text-4xl font-black leading-tight';
  return (
    <div className="flex-1 flex flex-col justify-center">
      <p className="text-center text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-3">
        {instruction}
      </p>
      {onSpeak ? (
        <button onClick={onSpeak} className="group mb-8">
          <p className={`text-center ${promptSize} font-extrabold text-ink dark:text-white group-hover:text-brand-500 transition-colors`}>
            🔊 {prompt}
          </p>
        </button>
      ) : (
        <p className={`text-center ${promptSize} font-extrabold text-ink dark:text-white mb-8 ${promptLang === 'en' ? '' : ''}`}>
          {prompt}
        </p>
      )}
      <div className="grid gap-3">
        {options.map((option, i) => (
          <button key={option} onClick={() => onSelect(option)} disabled={!!feedback} className={optionClasses(option, selected, feedback, correctAnswer)}>
            <span className="inline-flex w-6 h-6 mr-3 rounded-lg bg-black/5 dark:bg-white/10 text-xs font-bold items-center justify-center opacity-70">
              {i + 1}
            </span>
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
