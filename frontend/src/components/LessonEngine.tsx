'use client';

/**
 * LessonEngine — the interactive tutoring session.
 * Teaches vocabulary in small chunks, drills it from multiple angles
 * (recognition, listening, typing, matching, speaking), gives instant
 * feedback, and re-queues anything the learner misses.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CurriculumLesson, VocabItem, GrammarSlide, DialogueTurn, getAllVocab } from '@/lib/curriculum';
import { Exercise, buildLessonSession, buildReviewSession, buildMistakesSession, buildRetry } from '@/lib/exercise-engine';
import { listenOnce, matchAnswer, matchSpoken, speechRecognitionSupported, MatchQuality } from '@/lib/speech';
import { speakNeural as speak, stopSpeaking } from '@/lib/tts';
import { addXp, completeLessonLocal, recordWordResult, recordPronunciationResult, loadProgress, currentStreak } from '@/lib/progress';

type Feedback =
  | { kind: 'correct'; note?: string }
  | { kind: 'wrong'; correctAnswer: string; note?: string }
  | null;

interface SessionStats {
  answered: number;
  firstTryCorrect: number;
  xp: number;
  bestCombo: number;
}

interface LessonEngineProps {
  lesson: CurriculumLesson | null;
  /**
   * 'lesson' runs the lesson curriculum; 'practice' runs a review session;
   * 'mistakes' drills only the words the learner has got wrong.
   */
  mode?: 'lesson' | 'practice' | 'mistakes';
}

const ACCENT_CHARS = ['á', 'é', 'í', 'ó', 'ú', 'ñ', '¿', '¡'];

export function LessonEngine({ lesson, mode = 'lesson' }: LessonEngineProps) {
  const router = useRouter();
  const srAvailable = useMemo(() => speechRecognitionSupported(), []);
  const allVocab = useMemo(() => getAllVocab(), []);

  const [queue, setQueue] = useState<Exercise[]>([]);
  const [built, setBuilt] = useState(false);
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [combo, setCombo] = useState(0);
  const [stats, setStats] = useState<SessionStats>({ answered: 0, firstTryCorrect: 0, xp: 0, bestCombo: 0 });
  const [finished, setFinished] = useState(false);
  // Per-exercise UI state
  const [selected, setSelected] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [listening, setListening] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [pairSelection, setPairSelection] = useState<{ side: 'es' | 'en'; value: string } | null>(null);
  const [pairShake, setPairShake] = useState<string | null>(null);
  const [pairMistakes, setPairMistakes] = useState(0);
  const [pickedTiles, setPickedTiles] = useState<number[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);

  const current = queue[index];
  const total = queue.length;

  // Build the session
  useEffect(() => {
    if (mode === 'mistakes') {
      setQueue(buildMistakesSession(srAvailable));
    } else if (mode === 'practice') {
      setQueue(buildReviewSession(null, srAvailable));
    } else if (lesson) {
      setQueue(buildLessonSession(lesson, srAvailable));
    }
    setBuilt(true);
  }, [lesson, mode, srAvailable]);

  // Reset per-exercise state and auto-play audio for listening/teach exercises
  useEffect(() => {
    setSelected(null);
    setTyped('');
    setSpokenText('');
    setListening(false);
    setMatchedPairs(new Set());
    setPairSelection(null);
    setPairMistakes(0);
    setPickedTiles([]);
    setFeedback(null);
    if (!current || !started) return;
    if (current.type === 'teach') {
      speak(current.word.es);
    } else if (current.type === 'listen_mcq' || current.type === 'listen_meaning') {
      speak(current.word.es);
    } else if (current.type === 'type_es') {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    return () => stopSpeaking();
  }, [index, current, started]);

  // Focus the continue button when feedback shows (Enter to continue)
  useEffect(() => {
    if (feedback) setTimeout(() => continueRef.current?.focus(), 50);
  }, [feedback]);

  const grade = useCallback(
    (correct: boolean, correctAnswer: string, note?: string) => {
      if (!current) return;
      const firstTry = !current.isRetry;
      if (!current.noWordTracking) {
        recordWordResult(current.word.id, correct);
        // Speaking exercises also feed the pronunciation signal the tutor uses.
        if (current.type === 'speak') recordPronunciationResult(current.word.id, correct);
      }

      if (correct) {
        const comboNext = combo + 1;
        const bonus = comboNext >= 5 ? 5 : comboNext >= 3 ? 2 : 0;
        const earned = (firstTry ? 10 : 5) + bonus;
        addXp(earned);
        setCombo(comboNext);
        setStats((s) => ({
          answered: s.answered + 1,
          firstTryCorrect: s.firstTryCorrect + (firstTry ? 1 : 0),
          xp: s.xp + earned,
          bestCombo: Math.max(s.bestCombo, comboNext),
        }));
        setFeedback({ kind: 'correct', note });
        // Replay the word being drilled (skip for synthetic/sentence anchors)
        if (!current.noWordTracking) speak(current.word.es, 1);
      } else {
        setCombo(0);
        setStats((s) => ({ ...s, answered: s.answered + 1 }));
        setFeedback({ kind: 'wrong', correctAnswer, note });
        // Re-queue this word a few exercises later, from an easier angle
        setQueue((q) => {
          const retry = buildRetry(current, allVocab);
          const insertAt = Math.min(q.length, index + 3);
          return [...q.slice(0, insertAt), retry, ...q.slice(insertAt)];
        });
      }
    },
    [current, combo, index, allVocab]
  );

  const handleContinue = useCallback(() => {
    stopSpeaking();
    if (index + 1 >= total) {
      // Session complete
      const accuracy = stats.answered > 0 ? Math.round((stats.firstTryCorrect / stats.answered) * 100) : 100;
      if (mode === 'lesson' && lesson) completeLessonLocal(lesson.slug, accuracy);
      else addXp(0); // practice/mistakes: touch streak even if all skipped
      setFinished(true);
    } else {
      setIndex((i) => i + 1);
    }
  }, [index, total, stats, lesson, mode]);

  // ---- Answer handlers per exercise type ----

  const submitChoice = (option: string) => {
    if (feedback || !current) return;
    setSelected(option);
    let correct = false;
    let correctAnswer = '';
    let note: string | undefined;
    if (current.type === 'mcq_es_en' || current.type === 'listen_meaning') {
      correct = option === current.word.en;
      correctAnswer = current.word.en;
    } else if (current.type === 'mcq_en_es' || current.type === 'listen_mcq') {
      correct = option === current.word.es;
      correctAnswer = current.word.es;
    } else if (current.type === 'fill_blank' && current.sentence) {
      correct = option === current.sentence.blank;
      correctAnswer = current.sentence.blank;
    } else if (current.type === 'concept_check' && current.check) {
      correct = option === current.check.correct;
      correctAnswer = current.check.correct;
      // The teacher explains WHY — whether you were right or wrong
      note = current.check.explanation;
    }
    grade(correct, correctAnswer, note);
  };

  const submitBuild = () => {
    if (feedback || !current?.build || !current.tiles) return;
    const answer = pickedTiles.map((i) => current.tiles![i]).join(' ');
    const target = current.build.es
      .replace(/[¿?¡!.,;:]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const quality = matchAnswer(answer, [target]);
    if (quality === 'exact' || quality === 'accents') {
      grade(true, current.build.es);
      speak(current.build.es);
    } else {
      grade(false, current.build.es);
    }
  };

  const submitTyped = () => {
    if (feedback || !current || !typed.trim()) return;
    const accepted = [current.word.es];
    // Accept without leading article/pronoun too
    const stripped = current.word.es.replace(/^(el|la|los|las|yo|tú|él|ella|nosotros)\s+/i, '');
    if (stripped !== current.word.es) accepted.push(stripped);
    const quality: MatchQuality = matchAnswer(typed, accepted);
    if (quality === 'exact') grade(true, current.word.es);
    else if (quality === 'accents') grade(true, current.word.es, `Watch the accents: ${current.word.es}`);
    else if (quality === 'close') grade(true, current.word.es, `Almost — it's spelled: ${current.word.es}`);
    else grade(false, current.word.es);
  };

  const startListening = async () => {
    if (feedback || !current || listening) return;
    setListening(true);
    setSpokenText('');
    const result = await listenOnce();
    setListening(false);
    if (result.error === 'unsupported') {
      handleSkipSpeaking();
      return;
    }
    if (!result.transcript) {
      setSpokenText('__none__');
      return;
    }
    setSpokenText(result.transcript.split('|')[0].trim());
    const ok = matchSpoken(result.transcript, current.word.es);
    grade(ok, current.word.es);
  };

  const handleSkipSpeaking = () => {
    // Skip without penalty (no mic / can't speak right now)
    handleContinue();
  };

  const handlePairTap = (side: 'es' | 'en', value: string, pairKey: string) => {
    if (!current?.pairs || matchedPairs.has(pairKey) || feedback) return;
    if (!pairSelection) {
      setPairSelection({ side, value });
      return;
    }
    if (pairSelection.side === side) {
      setPairSelection({ side, value });
      return;
    }
    // Opposite sides selected — check the match
    const es = side === 'es' ? value : pairSelection.value;
    const en = side === 'en' ? value : pairSelection.value;
    const pair = current.pairs.find((p) => p.es === es && p.en === en);
    setPairSelection(null);
    if (pair) {
      speak(pair.es, 1);
      const next = new Set(matchedPairs);
      next.add(pair.es);
      setMatchedPairs(next);
      if (next.size === current.pairs.length) {
        const clean = pairMistakes === 0;
        grade(clean, '', clean ? 'Perfect match!' : undefined);
      }
    } else {
      setPairMistakes((m) => m + 1);
      setPairShake(value);
      setTimeout(() => setPairShake(null), 400);
    }
  };

  // Keyboard shortcuts: 1-4 select options, Enter submits/continues
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (feedback) {
        if (e.key === 'Enter') handleContinue();
        return;
      }
      if (!current) return;
      if (current.options && ['1', '2', '3', '4'].includes(e.key)) {
        const opt = current.options[parseInt(e.key) - 1];
        if (opt) submitChoice(opt);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, feedback, handleContinue]);

  // ---------- Screens ----------

  if (!lesson && mode === 'lesson') return null;

  if (queue.length === 0) {
    // Mistakes mode with nothing to fix — celebrate instead of spinning.
    if (built && mode === 'mistakes') {
      return (
        <div className="min-h-screen bg-paper dark:bg-paper-dark flex flex-col">
          <TopExitBar onExit={() => router.push('/lessons')} />
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="max-w-md w-full text-center">
              <p className="text-6xl mb-4">🎉</p>
              <h1 className="font-display text-3xl font-black text-ink dark:text-white mb-2">
                No mistakes to fix
              </h1>
              <p className="text-ink-soft dark:text-stone-400 mb-8">
                Nothing you’ve slipped up on is outstanding right now. Keep it going with a lesson
                or a chat with your tutor.
              </p>
              <button onClick={() => router.push('/lessons')} className="btn-primary px-8 py-3">
                Back to lessons
              </button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper dark:bg-paper-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500" />
      </div>
    );
  }

  // Intro screen
  if (!started) {
    const p = loadProgress();
    return (
      <div className="min-h-screen bg-paper dark:bg-paper-dark flex flex-col">
        <TopExitBar onExit={() => router.push('/lessons')} />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-md w-full text-center">
            <div className="mx-auto mb-6 w-24 h-24 rounded-[28px] bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-5xl shadow-glow ring-1 ring-black/5 animate-pop">
              <span className="drop-shadow-sm">{lesson?.emoji || (mode === 'mistakes' ? '🩹' : '⚡')}</span>
            </div>
            <h1 className="font-display text-4xl font-black text-ink dark:text-white mb-3 leading-tight">
              {mode === 'mistakes' ? 'Fix your mistakes' : mode === 'practice' ? 'Smart Practice' : lesson?.title}
            </h1>
            <p className="text-ink-soft dark:text-stone-400 mb-6">
              {mode === 'mistakes'
                ? 'A quick session on the exact words you’ve slipped up on — in lessons or with your tutor.'
                : mode === 'practice'
                ? 'A personalised session targeting the words your memory is about to drop.'
                : lesson?.description}
            </p>
            {mode === 'lesson' && lesson && !lesson.isReview && (
              <div className="surface p-4 mb-4 text-left">
                <p className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wide mb-2">
                  In this lesson
                </p>
                <ul className="space-y-1.5 text-sm text-stone-700 dark:text-stone-300">
                  {(lesson.grammar ?? []).map((g, i) => (
                    <li key={i}>📖 {g.title}</li>
                  ))}
                  {lesson.vocab.length > 0 && <li>✨ {lesson.vocab.length} new words</li>}
                  {lesson.dialogue && <li>💬 A real conversation to work through</li>}
                  {(lesson.builds ?? []).length > 0 && (
                    <li>🔨 Build {lesson.builds!.length} full sentences yourself</li>
                  )}
                </ul>
              </div>
            )}
            <div className="rounded-2xl bg-saffron-400/10 border border-saffron-400/30 p-4 mb-8 text-left">
              <p className="text-sm text-saffron-600 dark:text-saffron-300">
                <span className="font-bold">💡 Tip:</span>{' '}
                {mode === 'mistakes'
                  ? 'Getting a word wrong, then nailing it soon after, is exactly how it sticks for good.'
                  : mode === 'practice'
                  ? 'Reviewing a word right before you forget it is what moves it to long-term memory.'
                  : lesson?.tip}
              </p>
            </div>
            <button
              onClick={() => setStarted(true)}
              className="btn-primary w-full py-4 text-lg"
            >
              {mode === 'mistakes' ? 'FIX THESE' : mode === 'practice' ? 'START PRACTICE' : 'START LESSON'}
            </button>
            <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">
              {total} exercises · 🔥 {currentStreak(p)} day streak
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Completion screen
  if (finished) {
    const accuracy = stats.answered > 0 ? Math.round((stats.firstTryCorrect / stats.answered) * 100) : 100;
    const p = loadProgress();
    return (
      <div className="min-h-screen bg-paper dark:bg-paper-dark flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="text-7xl mb-4 animate-bounce-slow">
            {accuracy >= 95 ? '🏆' : accuracy >= 80 ? '🎉' : '💪'}
          </div>
          <h1 className="font-display text-5xl font-black text-ink dark:text-white mb-3">
            {accuracy >= 95 ? '¡Perfecto!' : accuracy >= 80 ? '¡Muy bien!' : '¡Bien hecho!'}
          </h1>
          <p className="text-ink-soft dark:text-stone-400 mb-8">
            {mode === 'practice' ? 'Practice session complete' : `${lesson?.title} complete`}
          </p>

          <div className="grid grid-cols-3 gap-3 mb-8">
            <StatCard label="XP earned" value={`+${stats.xp}`} color="text-saffron-500" delay="0ms" />
            <StatCard label="Accuracy" value={`${accuracy}%`} color="text-brand-500" delay="150ms" />
            <StatCard label="Best combo" value={`${stats.bestCombo}x`} color="text-terra-500" delay="300ms" />
          </div>

          <div className="surface p-4 mb-8 flex items-center justify-center gap-3">
            <span className="text-3xl">🔥</span>
            <div className="text-left">
              <p className="font-extrabold text-stone-900 dark:text-white text-lg">
                {currentStreak(p)} day streak
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400">Come back tomorrow to keep it alive</p>
            </div>
          </div>

          <button
            onClick={() => router.push('/lessons')}
            className="btn-primary w-full py-4 text-lg"
          >
            CONTINUE
          </button>
        </div>
      </div>
    );
  }

  const progressPct = total > 0 ? (index / total) * 100 : 0;

  return (
    <div className="min-h-screen bg-paper dark:bg-paper-dark flex flex-col">
      {/* Top bar: exit + progress + combo */}
      <div className="px-4 pt-4 pb-2 max-w-2xl mx-auto w-full flex items-center gap-3">
        <button
          onClick={() => router.push('/lessons')}
          className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-2xl leading-none p-1"
          aria-label="Quit lesson"
        >
          ✕
        </button>
        <div className="flex-1 h-3.5 bg-stone-200/80 dark:bg-stone-800 rounded-full overflow-hidden shadow-inner">
          <div
            className="h-full progress-shimmer rounded-full transition-all duration-500"
            style={{ width: `${Math.max(progressPct, 3)}%` }}
          />
        </div>
        <div
          className={`flex items-center gap-1 font-extrabold text-sm rounded-full px-2.5 py-1 ${
            combo >= 3 ? 'bg-terra-500/10 text-terra-500 animate-pop' : 'text-stone-400'
          }`}
          key={combo}
        >
          🔥 {combo}
        </div>
      </div>

      {/* Exercise area */}
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 pb-40 pt-4">
        {current.isRetry && (
          <p className="text-center text-xs font-extrabold text-terra-500 uppercase tracking-[0.15em] mb-2">
            ↻ Let&apos;s try this one again
          </p>
        )}

        {current.type === 'teach' && <TeachCard word={current.word} />}

        {current.type === 'grammar_slide' && current.slide && (
          <GrammarSlideCard slide={current.slide} />
        )}

        {current.type === 'dialogue_slide' && current.dialogue && (
          <DialogueCard dialogue={current.dialogue} />
        )}

        {current.type === 'concept_check' && current.check && (
          <ChoiceExercise
            prompt={current.check.question}
            promptLang="en"
            instruction="🧠 Think it through"
            options={current.options!}
            selected={selected}
            feedback={feedback}
            correctAnswer={current.check.correct}
            onSelect={submitChoice}
            smallPrompt
          />
        )}

        {current.type === 'build_sentence' && current.build && current.tiles && (
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-center text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-3">
              Build the sentence
            </p>
            <p className="font-display text-center text-3xl font-black text-ink dark:text-white mb-6 leading-snug">
              &ldquo;{current.build.en}&rdquo;
            </p>

            {/* Answer line */}
            <div className="min-h-[68px] bg-white/70 dark:bg-paper-dark-soft/70 rounded-2xl border-2 border-dashed border-stone-300 dark:border-stone-700 p-3 mb-6 flex flex-wrap gap-2 items-center justify-center">
              {pickedTiles.length === 0 && (
                <span className="text-stone-400 dark:text-stone-500 text-sm">
                  Tap the words below in order
                </span>
              )}
              {pickedTiles.map((tileIdx, pos) => (
                <button
                  key={`${tileIdx}-${pos}`}
                  onClick={() =>
                    !feedback && setPickedTiles((p) => p.filter((_, i) => i !== pos))
                  }
                  className="px-3.5 py-2 rounded-xl bg-brand-500 text-white font-bold shadow-[0_2px_0_0_#1B6141] active:translate-y-0.5 active:shadow-none transition-all"
                >
                  {current.tiles![tileIdx]}
                </button>
              ))}
            </div>

            {/* Tile bank */}
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {current.tiles.map((tile, i) => {
                const used = pickedTiles.includes(i);
                return (
                  <button
                    key={i}
                    onClick={() => !feedback && !used && setPickedTiles((p) => [...p, i])}
                    disabled={used || !!feedback}
                    className={`px-3.5 py-2 rounded-xl border-2 font-bold transition-all ${
                      used
                        ? 'bg-stone-100 dark:bg-stone-800/60 border-stone-200 dark:border-stone-800 text-transparent select-none shadow-none'
                        : 'bg-white dark:bg-paper-dark-soft border-stone-200 dark:border-stone-700 text-ink dark:text-stone-100 hover:border-brand-400 shadow-[0_2px_0_0_#E7E5E4] dark:shadow-[0_2px_0_0_#44403C] active:translate-y-0.5 active:shadow-none'
                    }`}
                  >
                    {tile}
                  </button>
                );
              })}
            </div>

            {!feedback && (
              <button
                onClick={submitBuild}
                disabled={pickedTiles.length === 0}
                className="btn-primary w-full py-4"
              >
                CHECK
              </button>
            )}
          </div>
        )}

        {(current.type === 'mcq_es_en' || current.type === 'mcq_en_es') && (
          <ChoiceExercise
            prompt={current.type === 'mcq_es_en' ? current.word.es : current.word.en}
            promptLang={current.type === 'mcq_es_en' ? 'es' : 'en'}
            instruction={
              current.type === 'mcq_es_en' ? 'What does this mean?' : 'Choose the Spanish'
            }
            options={current.options!}
            selected={selected}
            feedback={feedback}
            correctAnswer={current.type === 'mcq_es_en' ? current.word.en : current.word.es}
            onSelect={submitChoice}
            onSpeak={current.type === 'mcq_es_en' ? () => speak(current.word.es) : undefined}
          />
        )}

        {(current.type === 'listen_mcq' || current.type === 'listen_meaning') && (
          <ListeningExercise
            instruction={
              current.type === 'listen_mcq' ? 'What did you hear?' : 'What does it mean?'
            }
            options={current.options!}
            selected={selected}
            feedback={feedback}
            correctAnswer={current.type === 'listen_mcq' ? current.word.es : current.word.en}
            onSelect={submitChoice}
            onPlay={(rate) => speak(current.word.es, rate)}
          />
        )}

        {current.type === 'type_es' && (
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-center text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-3">
              Type this in Spanish
            </p>
            <p className="font-display text-center text-4xl font-black text-ink dark:text-white mb-8">
              {current.word.en}
            </p>
            <input
              ref={inputRef}
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitTyped()}
              disabled={!!feedback}
              placeholder="Escribe en español…"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="w-full text-xl px-5 py-4 rounded-2xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-paper-dark-soft text-ink dark:text-white shadow-card dark:shadow-card-dark focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 transition-all"
            />
            <div className="flex flex-wrap gap-2 mt-3 justify-center">
              {ACCENT_CHARS.map((ch) => (
                <button
                  key={ch}
                  onClick={() => {
                    setTyped((t) => t + ch);
                    inputRef.current?.focus();
                  }}
                  disabled={!!feedback}
                  className="w-10 h-10 rounded-xl bg-white dark:bg-paper-dark-soft border border-stone-200 dark:border-stone-700 text-lg font-bold text-ink-soft dark:text-stone-200 shadow-[0_2px_0_0_#E7E5E4] dark:shadow-[0_2px_0_0_#44403C] hover:border-brand-400 hover:text-brand-600 active:translate-y-0.5 active:shadow-none transition-all"
                >
                  {ch}
                </button>
              ))}
            </div>
            {!feedback && (
              <button
                onClick={submitTyped}
                disabled={!typed.trim()}
                className="mt-6 btn-primary w-full py-4"
              >
                CHECK
              </button>
            )}
          </div>
        )}

        {current.type === 'fill_blank' && current.sentence && (
          <FillBlankExercise
            sentence={current.sentence}
            options={current.options!}
            selected={selected}
            feedback={feedback}
            onSelect={submitChoice}
          />
        )}

        {current.type === 'match_pairs' && current.pairs && (
          <MatchPairsExercise
            pairs={current.pairs}
            matched={matchedPairs}
            selection={pairSelection}
            shake={pairShake}
            onTap={handlePairTap}
          />
        )}

        {current.type === 'speak' && (
          <div className="flex-1 flex flex-col justify-center items-center">
            <p className="text-center text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-3">
              Say this out loud
            </p>
            <button
              onClick={() => speak(current.word.es)}
              className="text-center mb-1 group"
            >
              <span className="font-display text-4xl font-black text-ink dark:text-white group-hover:text-brand-500 transition-colors">
                🔊 {current.word.es}
              </span>
            </button>
            <p className="text-stone-500 dark:text-stone-400 italic mb-1">{current.word.pron}</p>
            <p className="text-stone-600 dark:text-stone-300 mb-8">&ldquo;{current.word.en}&rdquo;</p>

            <button
              onClick={startListening}
              disabled={!!feedback || listening}
              className={`w-24 h-24 rounded-[32px] flex items-center justify-center text-4xl transition-all active:scale-95 ${
                listening
                  ? 'bg-terra-500 text-white animate-pulse-ring'
                  : 'bg-gradient-to-br from-sky-400 to-blue-600 hover:brightness-105 text-white shadow-[0_4px_0_0_#1D4ED8,0_16px_32px_-8px_rgba(37,99,235,0.5)] active:translate-y-1 active:shadow-[0_1px_0_0_#1D4ED8]'
              }`}
              aria-label="Hold to speak"
            >
              🎤
            </button>
            <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">
              {listening ? 'Listening… speak now' : 'Tap the mic, then speak'}
            </p>
            {spokenText === '__none__' && !feedback && (
              <p className="mt-2 text-sm text-terra-500 font-semibold">
                Didn&apos;t catch that — try again, a bit louder
              </p>
            )}
            {spokenText && spokenText !== '__none__' && (
              <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
                Heard: <span className="font-bold">&ldquo;{spokenText}&rdquo;</span>
              </p>
            )}
            {!feedback && (
              <button
                onClick={handleSkipSpeaking}
                className="mt-6 text-sm text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 underline"
              >
                Can&apos;t speak right now
              </button>
            )}
          </div>
        )}

        {/* Continue button for ungraded teaching cards */}
        {(current.type === 'teach' ||
          current.type === 'grammar_slide' ||
          current.type === 'dialogue_slide') && (
          <button
            onClick={handleContinue}
            className="mt-6 btn-primary w-full py-4"
          >
            GOT IT
          </button>
        )}
      </div>

      {/* Feedback sheet */}
      {feedback && (
        <div
          className={`fixed bottom-0 left-0 right-0 animate-slide-up rounded-t-[28px] shadow-[0_-12px_40px_-12px_rgba(33,29,25,0.25)] ${
            feedback.kind === 'correct'
              ? 'bg-brand-50 dark:bg-brand-900 border-t border-brand-200 dark:border-brand-700'
              : 'bg-[#FBEFE9] dark:bg-[#3A1F14] border-t border-terra-300/60 dark:border-terra-600/50'
          }`}
        >
          <div className="max-w-2xl mx-auto px-6 py-5">
            <div className="flex items-start gap-3 mb-4">
              <span
                className={`flex w-11 h-11 shrink-0 items-center justify-center rounded-2xl text-2xl ${
                  feedback.kind === 'correct'
                    ? 'bg-brand-500/15 text-brand-600'
                    : 'bg-terra-500/15 text-terra-500'
                }`}
              >
                {feedback.kind === 'correct' ? '✓' : '✕'}
              </span>
              <div>
                <p
                  className={`text-xl font-extrabold ${
                    feedback.kind === 'correct'
                      ? 'text-brand-700 dark:text-brand-200'
                      : 'text-terra-600 dark:text-terra-300'
                  }`}
                >
                  {feedback.kind === 'correct'
                    ? combo >= 3
                      ? `¡Excelente! ${combo} in a row 🔥`
                      : '¡Correcto!'
                    : 'Not quite'}
                </p>
                {feedback.kind === 'correct' && feedback.note && (
                  <p className="text-sm text-brand-700 dark:text-brand-200 mt-1">{feedback.note}</p>
                )}
                {feedback.kind === 'wrong' && feedback.correctAnswer && (
                  <div className="text-sm text-terra-600 dark:text-terra-300 mt-1">
                    <p>
                      Correct answer: <span className="font-bold">{feedback.correctAnswer}</span>
                    </p>
                    {feedback.note && (
                      <p className="mt-1.5 bg-white/60 dark:bg-black/20 rounded-lg px-3 py-2 leading-snug">
                        💡 {feedback.note}
                      </p>
                    )}
                    <p className="text-xs mt-1 opacity-80">
                      Don&apos;t worry — it&apos;ll come back around.
                    </p>
                  </div>
                )}
              </div>
            </div>
            <button
              ref={continueRef}
              onClick={handleContinue}
              className={`w-full py-4 text-lg ${
                feedback.kind === 'correct' ? 'btn-primary' : 'btn-danger'
              }`}
            >
              CONTINUE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Sub-components ----------

function TopExitBar({ onExit }: { onExit: () => void }) {
  return (
    <div className="px-4 pt-4 max-w-2xl mx-auto w-full">
      <button
        onClick={onExit}
        className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-2xl leading-none p-1"
        aria-label="Back"
      >
        ✕
      </button>
    </div>
  );
}

function StatCard({ label, value, color, delay }: { label: string; value: string; color: string; delay: string }) {
  return (
    <div
      className="bg-white dark:bg-stone-800 rounded-2xl p-4 border border-stone-200 dark:border-stone-700 animate-pop"
      style={{ animationDelay: delay, animationFillMode: 'backwards' }}
    >
      <p className={`font-display text-3xl font-black ${color}`}>{value}</p>
      <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">{label}</p>
    </div>
  );
}

function TeachCard({ word }: { word: VocabItem }) {
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

function GrammarSlideCard({ slide }: { slide: GrammarSlide }) {
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

function DialogueCard({ dialogue }: { dialogue: DialogueTurn[] }) {
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

function optionClasses(option: string, selected: string | null, feedback: Feedback, correctAnswer: string): string {
  const base = 'w-full px-5 py-4 text-left text-lg font-semibold ';
  if (!feedback) {
    return base + 'option-tile';
  }
  if (option === correctAnswer) {
    return base + 'option-tile option-tile-correct';
  }
  if (option === selected) {
    return base + 'option-tile option-tile-wrong animate-shake';
  }
  return base + 'option-tile option-tile-faded';
}

function ChoiceExercise({
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

function ListeningExercise({
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

function FillBlankExercise({
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

function MatchPairsExercise({
  pairs,
  matched,
  selection,
  shake,
  onTap,
}: {
  pairs: Array<{ es: string; en: string }>;
  matched: Set<string>;
  selection: { side: 'es' | 'en'; value: string } | null;
  shake: string | null;
  onTap: (side: 'es' | 'en', value: string, pairKey: string) => void;
}) {
  // Spanish column keeps generation order; English column alphabetical so
  // the two sides never line up.
  const esCol = useMemo(() => [...pairs], [pairs]);
  const enCol = useMemo(
    () => [...pairs].map((p) => p.en).sort((a, b) => a.localeCompare(b)),
    [pairs]
  );

  const btnClass = (side: 'es' | 'en', value: string, pairKey: string) => {
    const base = 'w-full px-3 py-4 font-semibold text-center ';
    if (matched.has(pairKey)) {
      return base + 'option-tile option-tile-correct pointer-events-none opacity-50';
    }
    if (shake === value) {
      return base + 'option-tile option-tile-wrong animate-shake';
    }
    if (selection && selection.side === side && selection.value === value) {
      return (
        base +
        'option-tile !border-sky-400 !bg-sky-50 dark:!bg-sky-900/30 !text-sky-700 dark:!text-sky-300'
      );
    }
    return base + 'option-tile';
  };

  return (
    <div className="flex-1 flex flex-col justify-center">
      <p className="text-center text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-6">
        Match the pairs
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-3 content-start">
          {esCol.map((p) => (
            <button key={p.es} onClick={() => onTap('es', p.es, p.es)} className={btnClass('es', p.es, p.es)}>
              {p.es}
            </button>
          ))}
        </div>
        <div className="grid gap-3 content-start">
          {enCol.map((en) => {
            const pair = pairs.find((p) => p.en === en)!;
            return (
              <button key={en} onClick={() => onTap('en', en, pair.es)} className={btnClass('en', en, pair.es)}>
                {en}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
