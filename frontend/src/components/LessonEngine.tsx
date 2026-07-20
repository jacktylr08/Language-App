'use client';

/**
 * LessonEngine — the interactive tutoring session.
 * Teaches vocabulary in small chunks, drills it from multiple angles
 * (recognition, listening, typing, matching, speaking), gives instant
 * feedback, and re-queues anything the learner misses.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CurriculumLesson, VocabItem, getAllVocab } from '@/lib/curriculum';
import { Exercise, buildLessonSession, buildReviewSession, buildRetry } from '@/lib/exercise-engine';
import { speak, stopSpeaking, listenOnce, matchAnswer, matchSpoken, speechRecognitionSupported, MatchQuality } from '@/lib/speech';
import { addXp, completeLessonLocal, recordWordResult, loadProgress, currentStreak } from '@/lib/progress';

type Feedback =
  | { kind: 'correct'; note?: string }
  | { kind: 'wrong'; correctAnswer: string }
  | null;

interface SessionStats {
  answered: number;
  firstTryCorrect: number;
  xp: number;
  bestCombo: number;
}

interface LessonEngineProps {
  lesson: CurriculumLesson | null;
  /** 'lesson' runs the lesson curriculum; 'practice' runs a review session */
  mode?: 'lesson' | 'practice';
}

const ACCENT_CHARS = ['á', 'é', 'í', 'ó', 'ú', 'ñ', '¿', '¡'];

export function LessonEngine({ lesson, mode = 'lesson' }: LessonEngineProps) {
  const router = useRouter();
  const srAvailable = useMemo(() => speechRecognitionSupported(), []);
  const allVocab = useMemo(() => getAllVocab(), []);

  const [queue, setQueue] = useState<Exercise[]>([]);
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
  const inputRef = useRef<HTMLInputElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);

  const current = queue[index];
  const total = queue.length;

  // Build the session
  useEffect(() => {
    if (mode === 'practice') {
      setQueue(buildReviewSession(null, srAvailable));
    } else if (lesson) {
      setQueue(buildLessonSession(lesson, srAvailable));
    }
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
      recordWordResult(current.word.id, correct);

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
        speak(current.word.es, 1);
      } else {
        setCombo(0);
        setStats((s) => ({ ...s, answered: s.answered + 1 }));
        setFeedback({ kind: 'wrong', correctAnswer });
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
      else if (mode === 'practice') addXp(0); // touch streak even if all skipped
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
    if (current.type === 'mcq_es_en' || current.type === 'listen_meaning') {
      correct = option === current.word.en;
      correctAnswer = current.word.en;
    } else if (current.type === 'mcq_en_es' || current.type === 'listen_mcq') {
      correct = option === current.word.es;
      correctAnswer = current.word.es;
    } else if (current.type === 'fill_blank' && current.sentence) {
      correct = option === current.sentence.blank;
      correctAnswer = current.sentence.blank;
    }
    grade(correct, correctAnswer);
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
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    );
  }

  // Intro screen
  if (!started) {
    const p = loadProgress();
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
        <TopExitBar onExit={() => router.push('/lessons')} />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-md w-full text-center">
            <div className="text-7xl mb-6 animate-pop">{lesson?.emoji || '⚡'}</div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">
              {mode === 'practice' ? 'Smart Practice' : lesson?.title}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {mode === 'practice'
                ? 'A personalised session targeting the words your memory is about to drop.'
                : lesson?.description}
            </p>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 mb-8 text-left">
              <p className="text-sm text-amber-900 dark:text-amber-200">
                <span className="font-bold">💡 Tip:</span>{' '}
                {mode === 'practice'
                  ? 'Reviewing a word right before you forget it is what moves it to long-term memory.'
                  : lesson?.tip}
              </p>
            </div>
            <button
              onClick={() => setStarted(true)}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white text-lg font-extrabold rounded-2xl shadow-lg shadow-emerald-500/30 transition-all"
            >
              {mode === 'practice' ? 'START PRACTICE' : 'START LESSON'}
            </button>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="text-7xl mb-4 animate-bounce-slow">
            {accuracy >= 95 ? '🏆' : accuracy >= 80 ? '🎉' : '💪'}
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">
            {accuracy >= 95 ? '¡Perfecto!' : accuracy >= 80 ? '¡Muy bien!' : '¡Bien hecho!'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-8">
            {mode === 'practice' ? 'Practice session complete' : `${lesson?.title} complete`}
          </p>

          <div className="grid grid-cols-3 gap-3 mb-8">
            <StatCard label="XP earned" value={`+${stats.xp}`} color="text-amber-500" delay="0ms" />
            <StatCard label="Accuracy" value={`${accuracy}%`} color="text-emerald-500" delay="150ms" />
            <StatCard label="Best combo" value={`${stats.bestCombo}x`} color="text-sky-500" delay="300ms" />
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-8 border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-3">
            <span className="text-3xl">🔥</span>
            <div className="text-left">
              <p className="font-extrabold text-slate-900 dark:text-white text-lg">
                {currentStreak(p)} day streak
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Come back tomorrow to keep it alive</p>
            </div>
          </div>

          <button
            onClick={() => router.push('/lessons')}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white text-lg font-extrabold rounded-2xl shadow-lg shadow-emerald-500/30 transition-all"
          >
            CONTINUE
          </button>
        </div>
      </div>
    );
  }

  const progressPct = total > 0 ? (index / total) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      {/* Top bar: exit + progress + combo */}
      <div className="px-4 pt-4 pb-2 max-w-2xl mx-auto w-full flex items-center gap-3">
        <button
          onClick={() => router.push('/lessons')}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl leading-none p-1"
          aria-label="Quit lesson"
        >
          ✕
        </button>
        <div className="flex-1 h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(progressPct, 3)}%` }}
          />
        </div>
        <div className={`flex items-center gap-1 font-extrabold text-sm ${combo >= 3 ? 'text-orange-500 animate-pop' : 'text-slate-400'}`} key={combo}>
          🔥 {combo}
        </div>
      </div>

      {/* Exercise area */}
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 pb-40 pt-4">
        {current.isRetry && (
          <p className="text-center text-xs font-bold text-orange-500 uppercase tracking-wide mb-2">
            ↻ Let&apos;s try this one again
          </p>
        )}

        {current.type === 'teach' && <TeachCard word={current.word} />}

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
            <p className="text-center text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
              Type this in Spanish
            </p>
            <p className="text-center text-3xl font-extrabold text-slate-900 dark:text-white mb-8">
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
              className="w-full text-xl px-5 py-4 rounded-2xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors"
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
                  className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-lg font-bold text-slate-700 dark:text-slate-200 hover:border-emerald-500 active:scale-95 transition-all"
                >
                  {ch}
                </button>
              ))}
            </div>
            {!feedback && (
              <button
                onClick={submitTyped}
                disabled={!typed.trim()}
                className="mt-6 w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 text-white font-extrabold rounded-2xl transition-all active:scale-[0.98]"
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
            <p className="text-center text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
              Say this out loud
            </p>
            <button
              onClick={() => speak(current.word.es)}
              className="text-center mb-1 group"
            >
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                🔊 {current.word.es}
              </span>
            </button>
            <p className="text-slate-500 dark:text-slate-400 italic mb-1">{current.word.pron}</p>
            <p className="text-slate-600 dark:text-slate-300 mb-8">&ldquo;{current.word.en}&rdquo;</p>

            <button
              onClick={startListening}
              disabled={!!feedback || listening}
              className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl shadow-lg transition-all active:scale-95 ${
                listening
                  ? 'bg-red-500 text-white animate-pulse-ring'
                  : 'bg-sky-500 hover:bg-sky-600 text-white shadow-sky-500/30'
              }`}
              aria-label="Hold to speak"
            >
              🎤
            </button>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              {listening ? 'Listening… speak now' : 'Tap the mic, then speak'}
            </p>
            {spokenText === '__none__' && !feedback && (
              <p className="mt-2 text-sm text-orange-500 font-semibold">
                Didn&apos;t catch that — try again, a bit louder
              </p>
            )}
            {spokenText && spokenText !== '__none__' && (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Heard: <span className="font-bold">&ldquo;{spokenText}&rdquo;</span>
              </p>
            )}
            {!feedback && (
              <button
                onClick={handleSkipSpeaking}
                className="mt-6 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline"
              >
                Can&apos;t speak right now
              </button>
            )}
          </div>
        )}

        {/* Teach card continue button */}
        {current.type === 'teach' && (
          <button
            onClick={handleContinue}
            className="mt-6 w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/30"
          >
            GOT IT
          </button>
        )}
      </div>

      {/* Feedback sheet */}
      {feedback && (
        <div
          className={`fixed bottom-0 left-0 right-0 animate-slide-up border-t-2 ${
            feedback.kind === 'correct'
              ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900'
          }`}
        >
          <div className="max-w-2xl mx-auto px-6 py-5">
            <div className="flex items-start gap-3 mb-4">
              <span className="text-3xl">{feedback.kind === 'correct' ? '✅' : '❌'}</span>
              <div>
                <p
                  className={`text-xl font-extrabold ${
                    feedback.kind === 'correct'
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-red-700 dark:text-red-300'
                  }`}
                >
                  {feedback.kind === 'correct'
                    ? combo >= 3
                      ? `¡Excelente! ${combo} in a row 🔥`
                      : '¡Correcto!'
                    : 'Not quite'}
                </p>
                {feedback.kind === 'correct' && feedback.note && (
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">{feedback.note}</p>
                )}
                {feedback.kind === 'wrong' && feedback.correctAnswer && (
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    Correct answer: <span className="font-bold">{feedback.correctAnswer}</span>
                    <span className="block text-xs mt-0.5 opacity-80">
                      Don&apos;t worry — it&apos;ll come back around.
                    </span>
                  </p>
                )}
              </div>
            </div>
            <button
              ref={continueRef}
              onClick={handleContinue}
              className={`w-full py-4 text-white font-extrabold rounded-2xl transition-all active:scale-[0.98] shadow-lg ${
                feedback.kind === 'correct'
                  ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'
                  : 'bg-red-500 hover:bg-red-600 shadow-red-500/30'
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
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl leading-none p-1"
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
      className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 animate-pop"
      style={{ animationDelay: delay, animationFillMode: 'backwards' }}
    >
      <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</p>
    </div>
  );
}

function TeachCard({ word }: { word: VocabItem }) {
  return (
    <div className="flex-1 flex flex-col justify-center">
      <p className="text-center text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-4">
        ✨ New word
      </p>
      <div className="bg-white dark:bg-slate-800 rounded-3xl border-2 border-slate-200 dark:border-slate-700 p-8 text-center shadow-sm">
        <button onClick={() => speak(word.es)} className="group">
          <p className="text-4xl font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors">
            🔊 {word.es}
          </p>
        </button>
        <p className="text-slate-500 dark:text-slate-400 italic mt-2">{word.pron}</p>
        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-4">{word.en}</p>
        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          <button onClick={() => speak(word.exampleEs)} className="group text-left w-full">
            <p className="text-lg text-slate-800 dark:text-slate-200 group-hover:text-emerald-500 transition-colors">
              🔉 {word.exampleEs}
            </p>
          </button>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{word.exampleEn}</p>
        </div>
      </div>
      <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-4">
        Tap anything with a speaker to hear it again
      </p>
    </div>
  );
}

function optionClasses(option: string, selected: string | null, feedback: Feedback, correctAnswer: string): string {
  const base =
    'w-full px-5 py-4 rounded-2xl border-2 text-left text-lg font-semibold transition-all active:scale-[0.98] ';
  if (!feedback) {
    return (
      base +
      'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-700'
    );
  }
  if (option === correctAnswer) {
    return base + 'bg-emerald-100 dark:bg-emerald-900/50 border-emerald-500 text-emerald-800 dark:text-emerald-200';
  }
  if (option === selected) {
    return base + 'bg-red-100 dark:bg-red-900/40 border-red-400 text-red-700 dark:text-red-300 animate-shake';
  }
  return base + 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500';
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
}) {
  return (
    <div className="flex-1 flex flex-col justify-center">
      <p className="text-center text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
        {instruction}
      </p>
      {onSpeak ? (
        <button onClick={onSpeak} className="group mb-8">
          <p className="text-center text-3xl font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors">
            🔊 {prompt}
          </p>
        </button>
      ) : (
        <p className={`text-center text-3xl font-extrabold text-slate-900 dark:text-white mb-8 ${promptLang === 'en' ? '' : ''}`}>
          {prompt}
        </p>
      )}
      <div className="grid gap-3">
        {options.map((option, i) => (
          <button key={option} onClick={() => onSelect(option)} disabled={!!feedback} className={optionClasses(option, selected, feedback, correctAnswer)}>
            <span className="inline-flex w-6 h-6 mr-3 rounded-md border border-current text-xs items-center justify-center opacity-50">
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
      <p className="text-center text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-6">
        🎧 {instruction}
      </p>
      <div className="flex items-center justify-center gap-4 mb-8">
        <button
          onClick={() => onPlay()}
          className="w-20 h-20 rounded-3xl bg-sky-500 hover:bg-sky-600 text-white text-3xl flex items-center justify-center shadow-lg shadow-sky-500/30 transition-all active:scale-95"
          aria-label="Play audio"
        >
          🔊
        </button>
        <button
          onClick={() => onPlay(0.6)}
          className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-2xl flex items-center justify-center hover:border-sky-400 transition-all active:scale-95"
          aria-label="Play slowly"
          title="Play slowly"
        >
          🐢
        </button>
      </div>
      <div className="grid gap-3">
        {options.map((option, i) => (
          <button key={option} onClick={() => onSelect(option)} disabled={!!feedback} className={optionClasses(option, selected, feedback, correctAnswer)}>
            <span className="inline-flex w-6 h-6 mr-3 rounded-md border border-current text-xs items-center justify-center opacity-50">
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
      <p className="text-center text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-6">
        Complete the sentence
      </p>
      <div className="bg-white dark:bg-slate-800 rounded-3xl border-2 border-slate-200 dark:border-slate-700 p-6 mb-2 text-center">
        <p className="text-2xl font-bold text-slate-900 dark:text-white leading-relaxed">
          {parts[0]}
          <span
            className={`inline-block min-w-[80px] border-b-4 mx-1 px-1 ${
              feedback
                ? feedback.kind === 'correct'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-red-400 text-red-500'
                : 'border-slate-400 text-slate-400'
            }`}
          >
            {shown}
          </span>
          {parts[1]}
        </p>
      </div>
      <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-6 italic">
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
    const base =
      'w-full px-3 py-4 rounded-2xl border-2 font-semibold transition-all active:scale-[0.97] text-center ';
    if (matched.has(pairKey)) {
      return base + 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-400 dark:text-emerald-600 pointer-events-none opacity-60';
    }
    if (shake === value) {
      return base + 'bg-red-100 dark:bg-red-900/40 border-red-400 text-red-600 animate-shake';
    }
    if (selection && selection.side === side && selection.value === value) {
      return base + 'bg-sky-100 dark:bg-sky-900/40 border-sky-500 text-sky-700 dark:text-sky-300';
    }
    return base + 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 hover:border-sky-400';
  };

  return (
    <div className="flex-1 flex flex-col justify-center">
      <p className="text-center text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-6">
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
