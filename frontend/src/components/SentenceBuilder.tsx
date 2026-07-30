'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/icons/Icon';
import { Profe } from '@/components/Profe';
import { Confetti } from '@/components/Confetti';
import { feedback as playFeedback } from '@/lib/feedback';
import { speakNeural as speak, stopSpeaking } from '@/lib/tts';
import { checkSentence, buildSkeleton, buildTiles, type SentenceResult } from '@/lib/sentence-check';
import { sentenceWords, getSentenceBank } from '@/lib/sentence-bank';
import { recordSentenceResult } from '@/lib/progress';
import type { ScopedSentence, SentenceStage } from '@/lib/sentence-scope';

/**
 * Saying something, one rung at a time.
 *
 * Every graded exercise in the rest of the app hands the learner the answer in
 * some form — four options to pick between, one word to type, tiles that are
 * already the right words. That trains recognition, which is why someone can
 * be strong on vocabulary and still unable to say anything: production from
 * nothing is a separate skill and nothing was training it.
 *
 * The ladder is the whole mechanic. The SAME sentence is met three times with
 * less help each time:
 *
 *   tiles     — assemble it from its own words (plus decoys)
 *   skeleton  — the frame is given, the meaning-bearing words are gaps
 *   free      — the English only; produce the Spanish from nothing
 *
 * Going straight to the third rung is how people conclude they can't do this;
 * staying on the first is how they never learn to. Promotion is one rung per
 * session (see recordSentenceResult), so a sentence has to be produced on
 * three separate occasions with decreasing support before it counts.
 */

interface SentenceBuilderProps {
  queue: ScopedSentence[];
  onDone: (stats: { answered: number; correct: number }) => void;
  onExit: () => void;
}

const STAGE_LABEL: Record<SentenceStage, string> = {
  tiles: 'Build it',
  skeleton: 'Fill the gaps',
  free: 'Say it yourself',
};

const STAGE_HINT: Record<SentenceStage, string> = {
  tiles: 'Tap the words in order',
  skeleton: 'Type the missing words',
  free: 'Write the whole sentence',
};

/** A pool of plausible decoy tiles, drawn from other sentences in the bank. */
function useDistractorPool(): string[] {
  return useMemo(() => {
    const words = new Set<string>();
    for (const s of getSentenceBank().slice(0, 200)) {
      for (const w of sentenceWords(s.es)) if (w.length > 2) words.add(w);
    }
    return Array.from(words);
  }, []);
}

export function SentenceBuilder({ queue, onDone, onExit }: SentenceBuilderProps) {
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<SentenceResult | null>(null);
  // Tracked separately from the result because the feedback for "I gave up"
  // is a different thing from the feedback for "you got it wrong". Running
  // the word diff on an empty answer marks every word as missing, which is
  // both meaningless and reads as a wall of red for someone who was honest.
  const [gaveUp, setGaveUp] = useState(false);
  const [stats, setStats] = useState({ answered: 0, correct: 0 });
  const [celebrate, setCelebrate] = useState(false);

  // Per-question working state
  const [picked, setPicked] = useState<string[]>([]);
  const [gaps, setGaps] = useState<string[]>([]);
  const [typed, setTyped] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const firstGapRef = useRef<HTMLInputElement>(null);

  const distractors = useDistractorPool();
  const current = queue[index];

  const skeleton = useMemo(
    () => (current && current.stage === 'skeleton' ? buildSkeleton(current.es) : null),
    [current]
  );
  const tiles = useMemo(
    () => (current && current.stage === 'tiles' ? buildTiles(current.es, distractors) : []),
    [current, distractors]
  );

  // Reset working state when the question changes, and put the cursor where
  // the learner is about to type.
  useEffect(() => {
    setResult(null);
    setGaveUp(false);
    setPicked([]);
    setTyped('');
    setGaps(skeleton ? new Array(skeleton.answers.length).fill('') : []);
    const t = setTimeout(() => {
      if (current?.stage === 'free') inputRef.current?.focus();
      else if (current?.stage === 'skeleton') firstGapRef.current?.focus();
    }, 60);
    return () => clearTimeout(t);
  }, [index, current?.stage, skeleton]);

  useEffect(() => () => stopSpeaking(), []);

  const submit = useCallback(() => {
    if (!current || result) return;

    let attempt: string;
    if (current.stage === 'tiles') attempt = picked.join(' ');
    else if (current.stage === 'skeleton' && skeleton) {
      // Rebuild the full sentence from the visible frame plus what they typed,
      // so the same checker marks every stage — one definition of "correct".
      let g = 0;
      attempt = skeleton.slots.map((s) => (s.gap ? gaps[g++] ?? '' : s.text)).join(' ');
    } else attempt = typed;

    const r = checkSentence(attempt, current.es);
    setResult(r);
    setStats((s) => ({ answered: s.answered + 1, correct: s.correct + (r.correct ? 1 : 0) }));
    recordSentenceResult(current.id, r.correct, current.stage);
    playFeedback(r.correct ? (r.nearMiss ? 'almost' : 'correct') : 'wrong');
    // Producing a sentence unaided is the thing this section exists for — it
    // deserves more than the same tick as tapping the right option.
    if (r.correct && current.stage === 'free') setCelebrate(true);
    if (r.correct) speak(current.es, 1);
  }, [current, result, picked, gaps, typed, skeleton]);

  const advance = useCallback(() => {
    setCelebrate(false);
    if (index + 1 >= queue.length) onDone(stats);
    else setIndex(index + 1);
  }, [index, queue.length, onDone, stats]);

  if (!current) return null;

  const canSubmit =
    current.stage === 'tiles'
      ? picked.length > 0
      : current.stage === 'skeleton'
        ? gaps.every((g) => g.trim().length > 0)
        : typed.trim().length > 0;

  const remainingTiles = (() => {
    // Tiles already used are removed by value, counting duplicates properly —
    // a sentence like "no, no es" legitimately repeats a word.
    const used = [...picked];
    return tiles.filter((t) => {
      const at = used.indexOf(t);
      if (at >= 0) {
        used.splice(at, 1);
        return false;
      }
      return true;
    });
  })();

  return (
    <div className="min-h-[100dvh] bg-paper dark:bg-paper-dark flex flex-col">
      {celebrate && <Confetti />}

      {/* Progress + exit */}
      <div className="shrink-0 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center gap-3">
        <button
          onClick={onExit}
          aria-label="Leave sentence practice"
          className="shrink-0 p-2 -ml-2 text-stone-400 hover:text-ink dark:hover:text-white transition-colors"
        >
          <Icon name="close" size={22} />
        </button>
        <div className="flex-1 h-2 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500"
            style={{ width: `${(index / queue.length) * 100}%` }}
          />
        </div>
        <span className="shrink-0 text-xs font-extrabold text-ink-soft dark:text-stone-400 tabular-nums">
          {index + 1}/{queue.length}
        </span>
      </div>

      <div className="flex-1 flex flex-col px-5 pb-[max(1rem,env(safe-area-inset-bottom))] max-w-md w-full mx-auto">
        {/* What rung we're on, and where the sentence came from — the second
            half is what makes "everything you've covered" visible rather than
            a claim. */}
        <div className="flex items-center justify-between mb-5">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-brand-600 dark:text-brand-400">
            {STAGE_LABEL[current.stage]}
          </span>
          <span className="flex items-center gap-1.5">
            {(['tiles', 'skeleton', 'free'] as SentenceStage[]).map((s, i) => {
              const reached = ['tiles', 'skeleton', 'free'].indexOf(current.stage) >= i;
              return (
                <span
                  key={s}
                  aria-hidden
                  className={`h-1.5 rounded-full transition-all ${
                    reached ? 'w-5 bg-brand-500' : 'w-1.5 bg-stone-300 dark:bg-stone-700'
                  }`}
                />
              );
            })}
          </span>
        </div>

        {/* The thing to say, in English. This is the prompt at every stage —
            production always starts from meaning, never from the Spanish.
            Anchored near the top rather than vertically centred: the answer
            area grows as tiles are placed, and centring made the prompt drift
            down the screen while the learner worked on it. */}
        <div className="flex-1 flex flex-col">
          <p className="text-xs font-bold uppercase tracking-wide text-stone-400 dark:text-stone-500 mb-2">
            {STAGE_HINT[current.stage]}
          </p>
          <p className="font-display text-3xl font-black text-ink dark:text-white leading-snug mb-7">
            {current.en}
          </p>

          {current.stage === 'tiles' && (
            <>
              {/* The answer line. An empty slot row keeps the layout from
                  jumping as words are added. */}
              <div className="min-h-[62px] rounded-2xl border-2 border-dashed border-stone-300 dark:border-stone-700 p-2.5 flex flex-wrap gap-2 content-start mb-5">
                {picked.length === 0 && (
                  <span className="text-sm text-stone-400 dark:text-stone-600 px-2 py-1.5">
                    Tap words below…
                  </span>
                )}
                {picked.map((w, i) => (
                  <button
                    key={`${w}-${i}`}
                    disabled={!!result}
                    onClick={() => setPicked(picked.filter((_, j) => j !== i))}
                    className="px-3 py-1.5 rounded-xl bg-brand-500 text-white font-bold text-[15px] shadow-sm active:scale-95 transition-transform disabled:opacity-70"
                  >
                    {w}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {remainingTiles.map((w, i) => (
                  <button
                    key={`${w}-${i}`}
                    disabled={!!result}
                    onClick={() => setPicked([...picked, w])}
                    className="px-3.5 py-2 rounded-xl bg-white dark:bg-paper-dark-soft border border-stone-200 dark:border-stone-700 font-bold text-[15px] text-ink dark:text-stone-100 shadow-[0_2px_0_0_#E7E5E4] dark:shadow-[0_2px_0_0_#44403C] active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50"
                  >
                    {w}
                  </button>
                ))}
              </div>
            </>
          )}

          {current.stage === 'skeleton' && skeleton && (
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-3 text-xl">
              {(() => {
                let gi = -1;
                return skeleton.slots.map((slot, i) => {
                  if (!slot.gap)
                    return (
                      <span key={i} className="font-semibold text-ink dark:text-stone-200">
                        {slot.text}
                      </span>
                    );
                  gi++;
                  const at = gi;
                  return (
                    <input
                      key={i}
                      ref={at === 0 ? firstGapRef : undefined}
                      value={gaps[at] ?? ''}
                      onChange={(e) => {
                        const next = [...gaps];
                        next[at] = e.target.value;
                        setGaps(next);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && canSubmit && submit()}
                      disabled={!!result}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      aria-label={`Missing word ${at + 1}`}
                      // Sized to the answer so the gap doesn't give away
                      // nothing at all, but doesn't spell out the letters.
                      style={{ width: `${Math.max(4, slot.text.length + 1)}ch` }}
                      className="px-2 py-1 rounded-lg border-b-2 border-brand-400 bg-brand-500/5 text-center font-bold text-ink dark:text-white focus:outline-none focus:bg-brand-500/10 disabled:opacity-70"
                    />
                  );
                });
              })()}
            </div>
          )}

          {current.stage === 'free' && (
            <>
              <input
                ref={inputRef}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && canSubmit && submit()}
                disabled={!!result}
                placeholder="Escríbelo en español…"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-label="Your sentence in Spanish"
                className="w-full text-xl px-5 py-4 rounded-2xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-paper-dark-soft text-ink dark:text-white shadow-card dark:shadow-card-dark focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 transition-all"
              />
              <div className="flex flex-wrap gap-2 mt-3 justify-center">
                {['á', 'é', 'í', 'ó', 'ú', 'ñ', '¿', '¡'].map((ch) => (
                  <button
                    key={ch}
                    disabled={!!result}
                    onClick={() => {
                      setTyped((t) => t + ch);
                      inputRef.current?.focus();
                    }}
                    className="w-10 h-10 rounded-xl bg-white dark:bg-paper-dark-soft border border-stone-200 dark:border-stone-700 text-lg font-bold text-ink-soft dark:text-stone-200 shadow-[0_2px_0_0_#E7E5E4] dark:shadow-[0_2px_0_0_#44403C] active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50"
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Action */}
        {!result ? (
          <div className="shrink-0 pt-6">
            <button onClick={submit} disabled={!canSubmit} className="btn-primary w-full py-4">
              CHECK
            </button>
            {/* The same escape hatch the lessons have: being stuck must never
                be a dead end, and an honest "I can't" is a better signal than
                a guess the learner knows is wrong. */}
            <button
              onClick={() => {
                if (result || !current) return;
                setGaveUp(true);
                setResult({ correct: false, nearMiss: false, words: [], note: '' });
                setStats((s) => ({ ...s, answered: s.answered + 1 }));
                recordSentenceResult(current.id, false, current.stage);
                playFeedback('wrong');
                speak(current.es, 1);
              }}
              className="mt-2 w-full py-3 text-sm font-bold text-ink-soft dark:text-stone-400 hover:text-ink dark:hover:text-stone-200 transition-colors"
            >
              I don&rsquo;t know — show me
            </button>
          </div>
        ) : (
          <div className="shrink-0 pt-6">
            {/* Word-by-word, so "wrong" is never the whole feedback. Seeing
                that seven of eight words were right is the difference between
                fixing one belief and concluding you can't do sentences. */}
            <div
              role="status"
              aria-live="polite"
              className={`rounded-2xl p-4 mb-3 ${
                result.correct
                  ? 'bg-brand-500/10 border border-brand-500/25'
                  : 'bg-terra-500/10 border border-terra-500/25'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Profe mood={result.correct ? 'happy' : 'encouraging'} size={34} />
                <p
                  className={`font-extrabold ${
                    result.correct
                      ? 'text-brand-700 dark:text-brand-300'
                      : 'text-terra-600 dark:text-terra-400'
                  }`}
                >
                  {result.correct
                    ? current.stage === 'free'
                      ? 'You said that from nothing.'
                      : result.nearMiss
                        ? 'That counts'
                        : '¡Eso es!'
                    : gaveUp
                      ? "Here's how it goes"
                      : 'Not quite'}
                </p>
              </div>

              {/* The word-by-word diff, but only when they actually attempted
                  something. On the give-up path every word is "missing", which
                  is a wall of red that says nothing they don't already know. */}
              {!gaveUp && (
                <p className="flex flex-wrap gap-x-1.5 gap-y-1 text-lg leading-snug mb-1">
                  {result.words.map((w, i) => (
                    <span
                      key={i}
                      className={
                        w.verdict === 'correct'
                          ? 'text-ink dark:text-stone-100 font-semibold'
                          : w.verdict === 'accent' || w.verdict === 'typo'
                            ? 'text-saffron-600 dark:text-saffron-400 font-semibold underline decoration-dotted'
                            : w.verdict === 'missing'
                              ? 'text-terra-600 dark:text-terra-400 font-bold underline decoration-wavy'
                              : 'text-terra-600 dark:text-terra-400 font-bold line-through'
                      }
                    >
                      {w.text}
                    </span>
                  ))}
                </p>
              )}

              {/* The answer, once. It's the headline on the give-up path and a
                  correction underneath the diff otherwise. */}
              {!result.correct && (
                <button
                  onClick={() => speak(current.es, 1)}
                  className={`inline-flex items-center gap-2 font-bold text-ink dark:text-stone-100 ${
                    gaveUp ? 'text-xl' : 'mt-1 text-[15px]'
                  }`}
                >
                  <Icon name="speaker" size={gaveUp ? 19 : 16} className="shrink-0" />
                  {current.es}
                </button>
              )}
              {result.note && !gaveUp && (
                <p className="text-sm text-ink-soft dark:text-stone-400 mt-1.5">{result.note}</p>
              )}
            </div>

            <button onClick={advance} className="btn-primary w-full py-4">
              {index + 1 >= queue.length ? 'FINISH' : 'CONTINUE'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
