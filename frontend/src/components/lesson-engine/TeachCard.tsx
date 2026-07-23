import type { VocabItem } from '@/lib/curriculum';
import { speakNeural as speak } from '@/lib/tts';

export function TeachCard({ word }: { word: VocabItem }) {
  return (
    <div className="flex-1 flex flex-col justify-center">
      <p className="text-center text-sm font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wide mb-4">
        ✨ New word
      </p>
      <div className="surface p-8 text-center">
        <button onClick={() => speak(word.es)} className="group">
          <p className="font-display text-5xl font-black text-ink dark:text-white group-hover:text-brand-500 transition-colors leading-tight">
            🔊 {word.es}
          </p>
        </button>
        <p className="text-stone-500 dark:text-stone-400 italic mt-2">{word.pron}</p>
        <p className="text-2xl font-extrabold text-brand-600 dark:text-brand-400 mt-4">{word.en}</p>
        <div className="mt-6 pt-6 border-t border-stone-200 dark:border-stone-700">
          <button onClick={() => speak(word.exampleEs)} className="group text-left w-full">
            <p className="text-lg text-stone-800 dark:text-stone-200 group-hover:text-brand-500 transition-colors">
              🔉 {word.exampleEs}
            </p>
          </button>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">{word.exampleEn}</p>
        </div>
      </div>
      <p className="text-center text-xs text-stone-400 dark:text-stone-500 mt-4">
        Tap anything with a speaker to hear it again
      </p>
    </div>
  );
}
