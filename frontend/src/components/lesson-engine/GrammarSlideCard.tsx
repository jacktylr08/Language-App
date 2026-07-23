import type { GrammarSlide } from '@/lib/curriculum';
import { speakNeural as speak } from '@/lib/tts';

export function GrammarSlideCard({ slide }: { slide: GrammarSlide }) {
  return (
    <div className="flex-1 flex flex-col justify-center">
      <p className="text-center text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-4">
        📖 Grammar — read this like your teacher explaining
      </p>
      <div className="surface !border-indigo-200/70 dark:!border-indigo-900/60 p-6 md:p-7">
        <h2 className="font-display text-3xl font-black text-ink dark:text-white mb-4">{slide.title}</h2>
        <div className="space-y-3 mb-5">
          {slide.body.split('\n\n').map((para, i) => (
            <p key={i} className="text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-line">
              {para}
            </p>
          ))}
        </div>
        <div className="border-t border-stone-200 dark:border-stone-700 pt-4 space-y-2">
          {slide.examples.map((ex, i) => (
            <button
              key={i}
              onClick={() => speak(ex.es)}
              className="w-full text-left group flex items-baseline gap-3 rounded-xl px-3 py-2 hover:bg-indigo-50 dark:hover:bg-stone-700/50 transition-colors"
            >
              <span className="font-bold text-stone-900 dark:text-white group-hover:text-indigo-500 transition-colors">
                🔉 {ex.es}
              </span>
              <span className="text-sm text-stone-500 dark:text-stone-400">{ex.en}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="text-center text-xs text-stone-400 dark:text-stone-500 mt-4">
        Tap any example to hear it — questions on this are coming next
      </p>
    </div>
  );
}
