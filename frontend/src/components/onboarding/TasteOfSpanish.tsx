'use client';

import { useState } from 'react';
import { Profe } from '@/components/Profe';
import { Icon } from '@/components/icons/Icon';
import { speakNeural as speak } from '@/lib/tts';
import { feedback, primeAudio } from '@/lib/feedback';

/**
 * The first fifteen seconds.
 *
 * Onboarding used to open with "Welcome, you@email.com! Let's set up your
 * Spanish learning journey", a progress bar reading "Step 1 of 4", and a
 * paragraph explaining the pedagogy. That's a settings wizard: it asks for
 * commitment before showing anybody what they're committing to, and the one
 * genuinely persuasive thing about this app — that a lesson is enjoyable —
 * is exactly what it withholds.
 *
 * So instead: teach one word, test it immediately, and let the learner
 * succeed before being asked for anything. The word is deliberately one an
 * English speaker can't guess ("de nada"), so the moment is a real one rather
 * than a formality — and the two-beat structure IS the app's actual loop, in
 * miniature. Nothing here is explained; it's demonstrated and then named.
 */

const WORD = {
  es: 'de nada',
  en: "you're welcome",
  pron: 'deh NAH-dah',
  literal: 'literally "of nothing"',
};

const OPTIONS = ["you're welcome", 'good night', 'excuse me', 'see you later'];

type Phase = 'teach' | 'test' | 'done';

export function TasteOfSpanish({ onSolved }: { onSolved: () => void }) {
  const [phase, setPhase] = useState<Phase>('teach');
  const [picked, setPicked] = useState<string | null>(null);

  const correct = picked === WORD.en;

  const hear = () => {
    // Also the gesture that lets the AudioContext start, so the answer chime
    // a few seconds later isn't swallowed.
    primeAudio();
    speak(WORD.es);
  };

  const answer = (option: string) => {
    if (picked) return;
    setPicked(option);
    const right = option === WORD.en;
    feedback(right ? 'correct' : 'wrong');
    if (right) {
      speak(WORD.es);
      setTimeout(() => setPhase('done'), 900);
    }
  };

  // ------------------------------------------------------------ teach

  if (phase === 'teach') {
    return (
      <div className="text-center animate-rise-in">
        <Profe mood="idle" size={104} className="mx-auto mb-3" />
        <p className="text-ink-soft dark:text-stone-400 mb-6">
          I&apos;m Profe. Before anything else — one word.
        </p>

        <button
          onClick={hear}
          className="surface w-full p-7 mb-6 transition-transform active:scale-[0.99]"
        >
          <p className="font-display text-5xl font-black text-ink dark:text-white">{WORD.es}</p>
          <p className="text-ink-soft dark:text-stone-400 italic mt-2">{WORD.pron}</p>
          <p className="text-2xl font-bold text-brand-600 dark:text-brand-400 mt-4">{WORD.en}</p>
          <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">{WORD.literal}</p>
          <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-stone-400 dark:text-stone-500">
            <Icon name="speaker" size={16} /> Tap to hear it
          </span>
        </button>

        <button onClick={() => setPhase('test')} className="btn-primary w-full py-4 text-lg">
          Got it
        </button>
      </div>
    );
  }

  // ------------------------------------------------------------- test

  if (phase === 'test') {
    return (
      <div className="animate-rise-in">
        <div className="text-center mb-6">
          <Profe mood={picked && !correct ? 'encouraging' : 'thinking'} size={88} className="mx-auto" />
          <p className="text-sm font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400 mt-2">
            So — what does it mean?
          </p>
          <p className="font-display text-4xl font-black text-ink dark:text-white mt-2">{WORD.es}</p>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {OPTIONS.map((option) => {
            const isPicked = picked === option;
            const isAnswer = option === WORD.en;
            // Once they've answered, always show where the right answer was —
            // being left wondering is the worst possible first impression.
            const state = !picked
              ? 'idle'
              : isAnswer
              ? 'right'
              : isPicked
              ? 'wrong'
              : 'muted';
            return (
              <button
                key={option}
                onClick={() => answer(option)}
                disabled={!!picked}
                className={`rounded-2xl border-2 px-4 py-3.5 text-left font-bold transition-all ${
                  state === 'right'
                    ? 'border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300'
                    : state === 'wrong'
                    ? 'border-terra-400 bg-terra-500/10 text-terra-600 dark:text-terra-400 animate-shake'
                    : state === 'muted'
                    ? 'border-stone-200 dark:border-stone-800 text-stone-400 dark:text-stone-600'
                    : 'border-stone-200 dark:border-stone-700 text-ink dark:text-stone-200 hover:border-brand-400 active:scale-[0.99]'
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>

        {picked && !correct && (
          <p className="mt-4 text-center text-sm text-ink-soft dark:text-stone-400">
            Close — <span className="font-bold">de nada</span> is what you say back when
            someone thanks you.{' '}
            <button onClick={() => setPhase('done')} className="underline font-bold">
              Carry on
            </button>
          </p>
        )}
      </div>
    );
  }

  // ------------------------------------------------------------- done

  return (
    <div className="text-center animate-rise-in">
      <Profe mood="happy" size={116} className="mx-auto mb-3 animate-pop" />
      <h1 className="font-display text-4xl font-black text-ink dark:text-white mb-3">
        That&apos;s the whole app.
      </h1>
      <p className="text-ink-soft dark:text-stone-400 leading-relaxed mb-6 px-2">
        Teach it, test it, then bring it back tomorrow — just before you&apos;d have forgotten
        it. Do that {' '}
        <span className="font-bold text-ink dark:text-stone-200">522 times</span> and you can
        hold a conversation.
      </p>
      <div className="surface p-4 mb-7 text-left">
        <p className="text-sm text-ink-soft dark:text-stone-400 leading-relaxed">
          You&apos;ll also talk to me out loud, read real stories, and get corrected properly —
          not just told you&apos;re wrong.
        </p>
      </div>
      <button onClick={onSolved} className="btn-primary w-full py-4 text-lg">
        Set me up
      </button>
    </div>
  );
}
