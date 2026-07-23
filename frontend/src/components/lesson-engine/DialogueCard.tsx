import { useState } from 'react';
import type { DialogueTurn } from '@/lib/curriculum';
import { speakNeural as speak, stopSpeaking } from '@/lib/tts';

export function DialogueCard({ dialogue }: { dialogue: DialogueTurn[] }) {
  const [playing, setPlaying] = useState(false);

  const playAll = async () => {
    if (playing) {
      stopSpeaking();
      setPlaying(false);
      return;
    }
    setPlaying(true);
    for (const turn of dialogue) {
      await speak(turn.es, 0.85);
    }
    setPlaying(false);
  };

  return (
    <div className="flex-1 flex flex-col justify-center">
      <p className="text-center text-sm font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wide mb-4">
        💬 Real conversation — listen and follow
      </p>
      <div className="surface !border-pink-200/70 dark:!border-pink-900/60 p-5 space-y-3">
        <button
          onClick={playAll}
          className="btn-3d w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold shadow-[0_3px_0_0_#BE185D] active:shadow-none"
        >
          {playing ? '⏸ Stop' : '▶ Play the whole conversation'}
        </button>
        {dialogue.map((turn, i) => {
          const isYou = turn.speaker === 'Tú';
          return (
            <button
              key={i}
              onClick={() => speak(turn.es, 0.85)}
              className={`block w-full text-left rounded-2xl px-4 py-3 transition-colors ${
                isYou
                  ? 'bg-brand-50 dark:bg-brand-900/20 ml-6 hover:bg-brand-100 dark:hover:bg-brand-900/40'
                  : 'bg-stone-50 dark:bg-stone-700/40 mr-6 hover:bg-stone-100 dark:hover:bg-stone-700/70'
              }`}
            >
              <span className={`text-xs font-bold uppercase tracking-wide ${isYou ? 'text-brand-600 dark:text-brand-400' : 'text-stone-400'}`}>
                {isYou ? 'You' : turn.speaker}
              </span>
              <span className="block font-semibold text-stone-900 dark:text-white mt-0.5">
                {turn.es}
              </span>
              <span className="block text-sm text-stone-500 dark:text-stone-400">{turn.en}</span>
            </button>
          );
        })}
      </div>
      <p className="text-center text-xs text-stone-400 dark:text-stone-500 mt-4">
        Tap any line to hear it — your lines are highlighted in green
      </p>
    </div>
  );
}
