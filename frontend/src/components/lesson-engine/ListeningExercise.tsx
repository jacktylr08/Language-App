import type { Feedback } from './types';
import { optionClasses } from './option-classes';

export function ListeningExercise({
  instruction,
  options,
  selected,
  feedback,
  correctAnswer,
  onSelect,
  onPlay,
}: {
  instruction: string;
  options: string[];
  selected: string | null;
  feedback: Feedback;
  correctAnswer: string;
  onSelect: (o: string) => void;
  onPlay: (rate?: number) => void;
}) {
  return (
    <div className="flex-1 flex flex-col justify-center">
      <p className="text-center text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-6">
        🎧 {instruction}
      </p>
      <div className="flex items-center justify-center gap-4 mb-8">
        <button
          onClick={() => onPlay()}
          className="btn-3d w-20 h-20 rounded-[26px] bg-gradient-to-br from-sky-400 to-blue-600 text-white text-3xl flex items-center justify-center shadow-[0_4px_0_0_#1D4ED8,0_16px_32px_-10px_rgba(37,99,235,0.5)] active:shadow-[0_1px_0_0_#1D4ED8]"
          aria-label="Play audio"
        >
          🔊
        </button>
        <button
          onClick={() => onPlay(0.6)}
          className="btn-3d w-14 h-14 rounded-2xl bg-white dark:bg-paper-dark-soft border-2 border-stone-200 dark:border-stone-700 text-2xl flex items-center justify-center shadow-[0_3px_0_0_#E7E5E4] dark:shadow-[0_3px_0_0_#44403C] hover:border-sky-400 active:shadow-none"
          aria-label="Play slowly"
          title="Play slowly"
        >
          🐢
        </button>
      </div>
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
