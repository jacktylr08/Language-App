'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { VocabItem } from '@/lib/curriculum';
import { speakNeural, stopSpeaking } from '@/lib/tts';
import { touchStreak } from '@/lib/progress';

interface ListenRepeatProps {
  words: VocabItem[];
  onClose: () => void;
}

// The classic Pimsleur/Glossika beat: hear it, get a real gap to say it back
// out loud, then hear it again in a full sentence for context, then the
// meaning. Eyes-free by design — nothing here requires looking at the screen.
const REPEAT_GAP_MS = 1700;
const STEP_GAP_MS = 700;
const POLL_MS = 80;

type Phase = 'word' | 'repeat-gap' | 'example' | 'meaning';

const PHASE_LABEL: Record<Phase, string> = {
  word: 'Listen…',
  'repeat-gap': 'Your turn — say it out loud',
  example: 'In a sentence…',
  meaning: 'It means…',
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Speaks `text`, but resolves early the moment `shouldStop()` goes true —
 * skip needs the sequence to move on immediately, and stopSpeaking() (called
 * on skip) clears the <audio> element's onended handler, so the underlying
 * speakNeural() promise would otherwise never resolve on its own. Polling is
 * simple and good enough at this granularity (skip/pause aren't sub-100ms
 * sensitive interactions).
 */
function interruptibleSpeak(text: string, rate: number, shouldStop: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearInterval(iv);
      resolve();
    };
    speakNeural(text, rate).then(finish);
    const iv = setInterval(() => {
      if (shouldStop()) finish();
    }, POLL_MS);
  });
}

function interruptibleWait(ms: number, shouldStop: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    const start = Date.now();
    const iv = setInterval(() => {
      if (shouldStop() || Date.now() - start >= ms) {
        clearInterval(iv);
        resolve();
      }
    }, POLL_MS);
  });
}

export function ListenRepeat({ words, onClose }: ListenRepeatProps) {
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('word');
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);

  const cancelledRef = useRef(false);
  const pausedRef = useRef(false);
  const skipRef = useRef(false);
  const runIdRef = useRef(0);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      stopSpeaking();
    };
  }, []);

  // Pause takes effect at the next phase boundary rather than hard-cutting
  // whatever's mid-sentence — simpler and avoids ever needing to "resume"
  // partway through a clip.
  const waitWhilePaused = useCallback(async () => {
    while (pausedRef.current && !cancelledRef.current) {
      await wait(150);
    }
  }, []);

  const runWord = useCallback(
    async (w: VocabItem) => {
      const shouldStop = () => cancelledRef.current || skipRef.current;

      await waitWhilePaused();
      if (shouldStop()) return;
      setPhase('word');
      await interruptibleSpeak(w.es, 0.9, shouldStop);
      if (shouldStop()) return;

      await waitWhilePaused();
      if (shouldStop()) return;
      setPhase('repeat-gap');
      await interruptibleWait(REPEAT_GAP_MS, shouldStop);
      if (shouldStop()) return;

      await waitWhilePaused();
      if (shouldStop()) return;
      setPhase('example');
      await interruptibleSpeak(w.exampleEs, 0.95, shouldStop);
      if (shouldStop()) return;

      await waitWhilePaused();
      if (shouldStop()) return;
      setPhase('meaning');
      await interruptibleSpeak(w.en, 1, shouldStop);
      if (shouldStop()) return;

      await interruptibleWait(STEP_GAP_MS, shouldStop);
    },
    [waitWhilePaused]
  );

  const runSequence = useCallback(
    async (fromIndex: number) => {
      const myRunId = ++runIdRef.current;
      for (let i = fromIndex; i < words.length; i++) {
        if (cancelledRef.current || runIdRef.current !== myRunId) return;
        setIndex(i);
        skipRef.current = false;
        await runWord(words[i]);
        if (cancelledRef.current || runIdRef.current !== myRunId) return;
      }
      if (!cancelledRef.current && runIdRef.current === myRunId) {
        setFinished(true);
        touchStreak();
      }
    },
    [words, runWord]
  );

  const handleStart = () => {
    // React 18 StrictMode's dev-only mount→cleanup→remount cycle runs the
    // unmount cleanup once right after mount, which sets cancelledRef true
    // before anything real happens — same bug class as RealtimeCall's
    // unmount effect. Nothing else ever resets it, so a real, user-driven
    // start must explicitly undo that here.
    cancelledRef.current = false;
    setStarted(true);
    void runSequence(0);
  };

  const handleSkip = () => {
    skipRef.current = true;
    stopSpeaking();
  };

  const handleTogglePause = () => setPaused((p) => !p);

  const handleRestart = () => {
    cancelledRef.current = false;
    setFinished(false);
    setIndex(0);
    void runSequence(0);
  };

  const current = words[index];

  if (!started) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-paper to-brand-50/40 dark:from-paper-dark dark:to-stone-950">
        <div className="shrink-0 px-4 py-4">
          <button
            onClick={onClose}
            className="text-ink-soft dark:text-stone-300 hover:text-ink dark:hover:text-white font-semibold text-sm inline-flex items-center gap-1.5"
          >
            <span aria-hidden>←</span> Lessons
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 shadow-glow flex items-center justify-center text-5xl mb-8">
            🎧
          </div>
          <h1 className="font-display text-3xl font-black text-ink dark:text-white">
            Listen &amp; Repeat
          </h1>
          <p className="text-ink-soft dark:text-stone-400 mt-2 max-w-sm">
            {words.length} words, back to back. Hear each one, say it out loud, hear it in a
            sentence — eyes off the screen the whole way through.
          </p>
          <button
            onClick={handleStart}
            className="mt-9 h-16 px-10 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 text-white font-extrabold text-lg shadow-glow hover:brightness-105 transition-all inline-flex items-center gap-3"
          >
            ▶ Start listening
          </button>
        </div>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-paper to-brand-50/40 dark:from-paper-dark dark:to-stone-950 px-6 text-center">
        <p className="text-5xl">🎧✓</p>
        <h1 className="font-display text-3xl font-black text-ink dark:text-white">Nice work</h1>
        <p className="text-ink-soft dark:text-stone-400">
          You listened &amp; repeated {words.length} words.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleRestart}
            className="h-12 px-6 rounded-full border-2 border-stone-200 dark:border-stone-700 font-extrabold text-ink-soft dark:text-stone-300"
          >
            Go again
          </button>
          <button onClick={onClose} className="btn-primary h-12 px-8">
            Done
          </button>
        </div>
      </div>
    );
  }

  const active = phase === 'word' || phase === 'example' || phase === 'meaning';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-paper to-brand-50/40 dark:from-paper-dark dark:to-stone-950">
      <div className="shrink-0 px-4 py-4 flex items-center justify-between">
        <button
          onClick={onClose}
          className="text-ink-soft dark:text-stone-300 hover:text-ink dark:hover:text-white font-semibold text-sm inline-flex items-center gap-1.5"
        >
          <span aria-hidden>✕</span> Exit
        </button>
        <span className="text-xs font-bold text-ink-soft/70 dark:text-stone-500">
          {index + 1} / {words.length}
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="relative flex items-center justify-center mb-10" aria-hidden>
          <div
            className={`absolute rounded-full bg-sky-500/20 ${
              phase === 'repeat-gap' ? 'w-56 h-56 animate-pulse' : active ? 'w-48 h-48 animate-pulse' : 'w-40 h-40'
            }`}
          />
          <div
            className={`relative w-32 h-32 rounded-full bg-gradient-to-br shadow-glow flex items-center justify-center text-5xl transition-all duration-300 ${
              phase === 'repeat-gap'
                ? 'from-terra-400 to-saffron-500 scale-110'
                : 'from-sky-400 to-blue-600 scale-105'
            }`}
          >
            🎧
          </div>
        </div>

        <p className="text-sm font-bold uppercase tracking-wide text-brand-600 dark:text-brand-400 mb-3">
          {paused ? 'Paused' : PHASE_LABEL[phase]}
        </p>

        {current && (
          <div className="max-w-lg">
            <p className="text-2xl leading-relaxed text-ink dark:text-white font-bold">
              {current.es}
            </p>
            {(phase === 'meaning' || paused) && (
              <p className="text-ink-soft dark:text-stone-400 mt-2">{current.en}</p>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 px-6 pb-10 pt-4 flex items-center justify-center gap-6">
        <button
          onClick={handleTogglePause}
          className="w-14 h-14 rounded-full flex items-center justify-center text-xl shadow-card bg-white dark:bg-stone-800 text-ink dark:text-white"
        >
          {paused ? '▶' : '⏸'}
        </button>
        <button
          onClick={handleSkip}
          className="h-14 px-8 rounded-full bg-stone-100 dark:bg-stone-800 text-ink-soft dark:text-stone-300 font-extrabold text-lg transition-colors inline-flex items-center gap-2"
        >
          Skip →
        </button>
      </div>
    </div>
  );
}
