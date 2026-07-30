'use client';

/**
 * LessonEngine — the interactive tutoring session.
 * Teaches vocabulary in small chunks, drills it from multiple angles
 * (recognition, listening, typing, matching, speaking), gives instant
 * feedback, and re-queues anything the learner misses.
 *
 * This component owns the exercise-type-specific UI (rendering + local
 * input state for whichever exercise is currently showing); the session's
 * own progress — the queue, score, grading, and advancing — lives in
 * useLessonSession, and each exercise-type's presentation lives in its own
 * file under ./lesson-engine.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAllVocab } from '@/lib/curriculum';
import { listenOnce, matchAnswer, matchSpoken, speechRecognitionSupported, MatchQuality } from '@/lib/speech';
import { speakNeural as speak, stopSpeaking } from '@/lib/tts';
import { loadProgress, currentStreak } from '@/lib/progress';
import { buildTutorContext } from '@/lib/tutor-context';
import {
  startRecording,
  assessPronunciationFromBlob,
  pronunciationRecordingSupported,
  type ActiveRecording,
  type PronunciationResult,
} from '@/lib/pronunciation';
import { api } from '@/lib/api';
import { primeAudio } from '@/lib/feedback';
import { Icon, type IconName } from '@/components/icons/Icon';
import { PronunciationScoreCard } from '@/components/PronunciationScoreCard';
import { useLessonSession } from './lesson-engine/useLessonSession';
import { TopExitBar } from './lesson-engine/TopExitBar';
import { StatCard } from './lesson-engine/StatCard';
import { CompletionScreen } from './lesson-engine/CompletionScreen';
import { RoundComplete } from './lesson-engine/RoundComplete';
import { TeachCard } from './lesson-engine/TeachCard';
import { GrammarSlideCard } from './lesson-engine/GrammarSlideCard';
import { DialogueCard } from './lesson-engine/DialogueCard';
import { ChoiceExercise } from './lesson-engine/ChoiceExercise';
import { ListeningExercise } from './lesson-engine/ListeningExercise';
import { FillBlankExercise } from './lesson-engine/FillBlankExercise';
import { MatchPairsExercise } from './lesson-engine/MatchPairsExercise';
import type { CurriculumLesson } from '@/lib/curriculum';

interface LessonEngineProps {
  lesson: CurriculumLesson | null;
  /**
   * 'lesson' runs the lesson curriculum; 'practice' runs a review session;
   * 'mistakes' drills only the words the learner has got wrong.
   */
  mode?: 'lesson' | 'practice' | 'mistakes';
}

/** A lesson theme's icon; falls back to a neutral sparkle. */
function themeIcon(theme?: string): IconName {
  const map: Record<string, IconName> = {
    phonetics: 'sound', verbs: 'verbs', family: 'family', nouns: 'objects',
    adjectives: 'palette', review: 'refresh', grammar: 'grammar', conversation: 'chat',
  };
  return (theme && map[theme]) || 'sparkle';
}

const ACCENT_CHARS = ['á', 'é', 'í', 'ó', 'ú', 'ñ', '¿', '¡'];

/**
 * The way out of a typing exercise you can't answer.
 *
 * Deliberately quiet — a plain text button under the primary one. It has to be
 * obviously available (the whole point is that being stuck shouldn't end the
 * lesson) without competing with actually trying, which is where the learning
 * happens. Sized to the 44px tap target so it isn't a fiddly escape hatch.
 */
function IDontKnowButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="mt-2 w-full py-3 text-sm font-bold text-ink-soft dark:text-stone-400 hover:text-ink dark:hover:text-stone-200 disabled:opacity-50 transition-colors"
    >
      I don&rsquo;t know — show me
    </button>
  );
}

export function LessonEngine({ lesson, mode = 'lesson' }: LessonEngineProps) {
  const router = useRouter();
  const srAvailable = useMemo(() => speechRecognitionSupported(), []);
  /**
   * Whether to put speaking exercises in the queue at all. This used to be
   * srAvailable alone, which silently removed every speaking exercise on
   * Firefox and in some iOS contexts — even though recording to Azure works
   * there perfectly well. Either route is enough to run the exercise.
   */
  const speakingAvailable = useMemo(
    () => speechRecognitionSupported() || pronunciationRecordingSupported(),
    []
  );
  const allVocab = useMemo(() => getAllVocab(), []);

  const {
    queue,
    setQueue,
    built,
    index,
    current,
    total,
    started,
    setStarted,
    feedback,
    setFeedback,
    combo,
    stats,
    finished,
    grade,
    handleContinue,
    resumable,
    resume,
    restart,
    roundComplete,
    nextRound,
    roundNumber,
    roundsTotal,
  } = useLessonSession({ lesson, mode, srAvailable: speakingAvailable, allVocab });

  // Per-exercise UI state
  const [selected, setSelected] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [listening, setListening] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  // Only used on the no-Web-Speech path, where the learner taps to stop.
  const [recording, setRecording] = useState<ActiveRecording | null>(null);
  const [scoring, setScoring] = useState(false);
  // Best-effort phoneme-level score (Azure Speech) — an extra readout on top
  // of the existing transcript-match grading, never a replacement for it.
  // null whenever it's not (yet, or ever) available; the exercise is graded
  // exactly as before regardless of whether this ever resolves.
  const [pronScore, setPronScore] = useState<PronunciationResult | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [pairSelection, setPairSelection] = useState<{ side: 'es' | 'en'; value: string } | null>(null);
  const [pairShake, setPairShake] = useState<string | null>(null);
  const [pairMistakes, setPairMistakes] = useState(0);
  const [pickedTiles, setPickedTiles] = useState<number[]>([]);
  const [writingText, setWritingText] = useState('');
  const [gradingWriting, setGradingWriting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);

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
    setWritingText('');
    setGradingWriting(false);
    setFeedback(null);
    if (!current || !started) return;
    if (current.type === 'teach') {
      speak(current.word.es);
    } else if (current.type === 'listen_meaning') {
      speak(current.word.es);
    } else if (current.type === 'type_es' || current.type === 'type_en') {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, current, started]);

  // Focus the continue button when feedback shows (Enter to continue)
  useEffect(() => {
    if (feedback) setTimeout(() => continueRef.current?.focus(), 50);
  }, [feedback]);

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
    } else if (current.type === 'mcq_en_es') {
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

  const submitTypedEn = () => {
    if (feedback || !current || !typed.trim()) return;
    const accepted = [current.word.en, ...(current.word.enAlt ?? [])];
    // Accept "eat" for "to eat" too — natural typing for verb infinitives
    const stripped = accepted.filter((a) => /^to\s+/i.test(a)).map((a) => a.replace(/^to\s+/i, ''));
    const quality: MatchQuality = matchAnswer(typed, [...accepted, ...stripped]);
    if (quality === 'exact' || quality === 'accents') grade(true, current.word.en);
    else if (quality === 'close') grade(true, current.word.en, `Almost — it's: ${current.word.en}`);
    else grade(false, current.word.en);
  };

  /**
   * "I don't know."
   *
   * A typing exercise with no way out is a dead end: if the word won't come,
   * the only moves are to guess something you know is wrong, or to abandon the
   * lesson. Guessing wrong is worse than admitting it — it pollutes the
   * scheduler with a failure the learner didn't mean, and it teaches them the
   * app punishes honesty.
   *
   * It grades as incorrect on purpose. Not knowing the word IS the state FSRS
   * needs to hear about, and it's exactly the signal that should bring the
   * word back soon. What changes is that the learner gets shown the answer and
   * moves on in one tap instead of being stuck.
   */
  const skipTyped = (answer: string) => {
    if (feedback || !current) return;
    grade(false, answer, "No problem — that's what the reviews are for.");
  };

  const submitWriting = async () => {
    if (feedback || !current?.writingPrompt || !writingText.trim() || gradingWriting) return;
    setGradingWriting(true);
    try {
      const { level, languageName } = buildTutorContext();
      const res = await api.post('/tutor/grade-writing', {
        instruction: current.writingPrompt.instruction,
        suggestedVocab: current.writingPrompt.suggested,
        answer: writingText.trim(),
        level,
        language: languageName,
      });
      const { correct, feedback: note, corrected } = res.data ?? {};
      grade(!!correct, typeof corrected === 'string' ? corrected : '', note || undefined);
    } catch {
      // The tutor's grading is a nice-to-have, not a gate — if it's not
      // configured or the network hiccups, don't block the learner's progress.
      grade(true, '', "Couldn't check that automatically this time — no worries, moving on.");
    } finally {
      setGradingWriting(false);
    }
  };

  /**
   * Speaking without the Web Speech API.
   *
   * Firefox has never shipped SpeechRecognition and it's unreliable on iOS,
   * particularly in a home-screen PWA. Speaking exercises used to be dropped
   * entirely for those browsers — no message, no fallback — so the app's
   * headline feature silently vanished for a chunk of learners.
   *
   * MediaRecorder + Azure works everywhere and is a stronger signal anyway
   * (it scores HOW the word was said, not just whether a transcript matched),
   * so here it grades the exercise on its own. The learner taps to start and
   * taps again to stop, since there's no recogniser to detect end-of-speech.
   */
  const startRecordOnlySpeaking = async () => {
    if (feedback || !current) return;
    const word = current.word;

    if (recording) {
      // Second tap — stop, score, grade.
      setRecording(null);
      setListening(false);
      setScoring(true);
      const clip = await recording.stop();
      const score = clip
        ? await assessPronunciationFromBlob(clip, word.es, buildTutorContext().languageName)
        : null;
      setScoring(false);

      if (!score) {
        // Nothing came back — a mic problem, or Azure isn't configured
        // server-side. Never mark the learner wrong for our own gap.
        setSpokenText('__none__');
        return;
      }
      setPronScore(score);
      // Azure's own scale: 60 is the conventional "understandable" threshold.
      grade(score.pronScore >= 60, word.es);
      return;
    }

    setSpokenText('');
    setPronScore(null);
    const rec = await startRecording();
    if (!rec) {
      // Mic denied or unavailable — skipping is right, and it's the same
      // outcome the learner gets from "Can't speak right now".
      handleSkipSpeaking();
      return;
    }
    setRecording(rec);
    setListening(true);
  };

  const startListening = async () => {
    if (feedback || !current || listening) return;
    if (!srAvailable) return startRecordOnlySpeaking();
    setListening(true);
    setSpokenText('');
    setPronScore(null);
    const word = current.word;

    // Start recording the SAME utterance concurrently with the browser's
    // own speech recognition below — starting this after listenOnce()
    // resolves would just capture silence, since the learner has already
    // finished speaking by then. Resolves null instantly if unsupported.
    const recordingPromise = startRecording();

    const result = await listenOnce();
    setListening(false);
    if (result.error === 'unsupported') {
      void recordingPromise.then((rec) => rec?.stop());
      handleSkipSpeaking();
      return;
    }
    if (!result.transcript) {
      setSpokenText('__none__');
      void recordingPromise.then((rec) => rec?.stop());
      return;
    }
    setSpokenText(result.transcript.split('|')[0].trim());
    const ok = matchSpoken(result.transcript, word.es);
    grade(ok, word.es);

    // Best-effort phoneme-level score, entirely in the background — never
    // awaited, never blocks grading, and silently does nothing if Azure
    // Speech isn't configured server-side or the browser can't record.
    const languageName = buildTutorContext().languageName;
    void recordingPromise.then(async (rec) => {
      const clip = await rec?.stop();
      if (!clip) return;
      const score = await assessPronunciationFromBlob(clip, word.es, languageName);
      if (score) setPronScore(score);
    });
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
              <Icon
                name={mode === 'mistakes' ? 'bandage' : mode === 'practice' ? 'review' : themeIcon(lesson?.theme)}
                size={40}
                className="drop-shadow-sm"
              />
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
                  {lesson.vocab.length >= 3 && (
                    <li className="flex items-center gap-2">
                      <Icon name="pencil" size={15} className="shrink-0 text-ink-soft" />
                      Write your own sentence, marked by Profe
                    </li>
                  )}
                </ul>
              </div>
            )}
            <div className="rounded-2xl bg-saffron-400/10 border border-saffron-400/30 p-4 mb-8 text-left">
              <p className="text-sm text-saffron-600 dark:text-saffron-300">
                <span className="inline-flex items-center gap-1.5 font-bold">
                  <Icon name="sparkle" size={15} /> Tip:
                </span>{' '}
                {mode === 'mistakes'
                  ? 'Getting a word wrong, then nailing it soon after, is exactly how it sticks for good.'
                  : mode === 'practice'
                  ? 'Reviewing a word right before you forget it is what moves it to long-term memory.'
                  : lesson?.tip}
              </p>
            </div>
            {resumable ? (
              /* Picked up rather than restarted. The alternative — silently
                 dropping someone back into exercise 41 — leaves them with no
                 idea why the lesson opened mid-flow, so the position is
                 stated and starting over stays one tap away. */
              <>
                <button
                  onClick={() => {
                    primeAudio();
                    resume();
                  }}
                  className="btn-primary w-full py-4 text-lg"
                >
                  RESUME · {resumable.index} / {resumable.total}
                </button>
                <button
                  onClick={restart}
                  className="mt-3 w-full py-3 text-sm font-bold text-stone-500 dark:text-stone-400 hover:text-ink dark:hover:text-stone-200 transition-colors"
                >
                  Start again from the beginning
                </button>
                <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
                  You left off part-way ·{' '}
                  <Icon name="flame" size={14} className="inline align-[-2px] text-terra-500" />{' '}
                  {currentStreak(p)} day streak
                </p>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    // Must happen inside a genuine gesture, or the first
                    // correct answer plays into a suspended context.
                    primeAudio();
                    setStarted(true);
                  }}
                  className="btn-primary w-full py-4 text-lg"
                >
                  {mode === 'mistakes' ? 'FIX THESE' : mode === 'practice' ? 'START PRACTICE' : 'START LESSON'}
                </button>
                <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">
                  {roundsTotal > 1
                    ? `${roundsTotal} rounds of about 3 minutes · `
                    : `${total} exercises · `}
                  <Icon name="flame" size={14} className="inline align-[-2px] text-terra-500" />{' '}
                  {currentStreak(p)} day streak
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // A round boundary — the honest stopping point inside a long lesson.
  if (roundComplete) {
    return (
      <RoundComplete
        roundNumber={roundNumber}
        roundsTotal={roundsTotal}
        stats={stats}
        onContinue={nextRound}
        onStop={() => router.push('/lessons')}
      />
    );
  }

  // Completion screen — staged, so finishing feels like an occasion rather
  // than a page. See CompletionScreen for why the beats are spaced.
  if (finished) {
    const accuracy = stats.answered > 0 ? Math.round((stats.firstTryCorrect / stats.answered) * 100) : 100;
    return (
      <CompletionScreen
        accuracy={accuracy}
        stats={stats}
        streak={currentStreak(loadProgress())}
        title={lesson?.title ?? null}
        lesson={lesson}
        mode={mode}
        onContinue={() => router.push('/lessons')}
      />
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
          <Icon name="close" size={22} />
        </button>
        <div className="flex-1">
          <div className="h-3.5 bg-stone-200/80 dark:bg-stone-800 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full progress-shimmer rounded-full transition-all duration-500"
              style={{ width: `${Math.max(progressPct, 3)}%` }}
            />
          </div>
          {/* Which round you're in. Without this the bar is the only signal,
              and a bar that's 30% full after four minutes reads as "ages to
              go" rather than "you're most of the way through round two". */}
          {roundsTotal > 1 && (
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-stone-400 dark:text-stone-600 mt-1 text-center">
              Round {roundNumber} of {roundsTotal}
            </p>
          )}
        </div>
        <div
          className={`flex items-center gap-1 font-extrabold text-sm rounded-full px-2.5 py-1 ${
            combo >= 3 ? 'bg-terra-500/10 text-terra-500 animate-pop' : 'text-stone-400'
          }`}
          key={combo}
        >
          <Icon name="flame" size={15} /> {combo}
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

        {current.type === 'listen_meaning' && (
          <ListeningExercise
            instruction="What does it mean?"
            options={current.options!}
            selected={selected}
            feedback={feedback}
            correctAnswer={current.word.en}
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
              <>
                <button
                  onClick={submitTyped}
                  disabled={!typed.trim()}
                  className="mt-6 btn-primary w-full py-4"
                >
                  CHECK
                </button>
                <IDontKnowButton onClick={() => skipTyped(current.word.es)} />
              </>
            )}
          </div>
        )}

        {current.type === 'type_en' && (
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-center text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-3">
              What does this mean?
            </p>
            <button onClick={() => speak(current.word.es)} className="text-center mb-1 group mx-auto">
              <p className="font-display text-4xl font-black text-ink dark:text-white group-hover:text-brand-500 transition-colors">
                <Icon name="speaker" size={26} className="inline align-[-3px] mr-1.5" />
                {current.word.es}
              </p>
            </button>
            <p className="text-center text-stone-500 dark:text-stone-400 italic mb-8">{current.word.pron}</p>
            <input
              ref={inputRef}
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitTypedEn()}
              disabled={!!feedback}
              placeholder="Type it in English…"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="w-full text-xl px-5 py-4 rounded-2xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-paper-dark-soft text-ink dark:text-white shadow-card dark:shadow-card-dark focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 transition-all"
            />
            {!feedback && (
              <>
                <button
                  onClick={submitTypedEn}
                  disabled={!typed.trim()}
                  className="mt-6 btn-primary w-full py-4"
                >
                  CHECK
                </button>
                <IDontKnowButton onClick={() => skipTyped(current.word.en)} />
              </>
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
                <Icon name="speaker" size={26} className="inline align-[-3px] mr-1.5" />
                {current.word.es}
              </span>
            </button>
            <p className="text-stone-500 dark:text-stone-400 italic mb-1">{current.word.pron}</p>
            <p className="text-stone-600 dark:text-stone-300 mb-8">&ldquo;{current.word.en}&rdquo;</p>

            <button
              onClick={startListening}
              /* Without Web Speech there's no recogniser to detect the end of
                 speech, so the mic stays live until a second tap — it must
                 not be disabled while recording. */
              disabled={!!feedback || scoring || (listening && srAvailable)}
              className={`w-24 h-24 rounded-[32px] flex items-center justify-center text-4xl transition-all active:scale-95 ${
                listening
                  ? 'bg-terra-500 text-white animate-pulse-ring'
                  : 'bg-gradient-to-br from-sky-400 to-blue-600 hover:brightness-105 text-white shadow-[0_4px_0_0_#1D4ED8,0_16px_32px_-8px_rgba(37,99,235,0.5)] active:translate-y-1 active:shadow-[0_1px_0_0_#1D4ED8]'
              }`}
              aria-label={
                scoring
                  ? 'Checking your pronunciation'
                  : listening
                  ? srAvailable
                    ? 'Listening — tap to stop'
                    : 'Recording — tap when you have finished'
                  : 'Tap to speak'
              }
            >
              {scoring ? '⏳' : '🎤'}
            </button>
            <p className="mt-4 text-sm text-stone-500 dark:text-stone-400" aria-live="polite">
              {scoring
                ? 'Checking how you said it…'
                : listening
                ? srAvailable
                  ? 'Listening… speak now'
                  : 'Recording — say it, then tap again'
                : 'Tap the mic, then speak'}
            </p>
            {spokenText === '__none__' && !feedback && (
              <p className="mt-2 text-sm text-terra-500 font-semibold">
                Didn&apos;t catch that — try again, a bit louder
              </p>
            )}
            {/* No transcript to echo back on the record-only path, so the
                score card below is the whole of the feedback. Say what's
                happening rather than leaving a silent gap. */}
            {!srAvailable && !listening && !scoring && !feedback && !spokenText && (
              <p className="mt-2 text-xs text-stone-400 dark:text-stone-500 max-w-xs text-center">
                Your browser can&apos;t transcribe speech, so this is scored on pronunciation instead.
              </p>
            )}
            {spokenText && spokenText !== '__none__' && (
              <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
                Heard: <span className="font-bold">&ldquo;{spokenText}&rdquo;</span>
              </p>
            )}
            {pronScore && <PronunciationScoreCard result={pronScore} />}
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

        {current.type === 'write_answer' && current.writingPrompt && (
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-center text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-3">
              <Icon name="pencil" size={15} className="inline align-[-2px] mr-1" /> Write it yourself
            </p>
            <p className="font-display text-center text-2xl font-black text-ink dark:text-white mb-4 leading-snug">
              {current.writingPrompt.instruction}
            </p>
            <div className="flex flex-wrap gap-2 justify-center mb-5">
              {current.writingPrompt.suggested.map((w, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-sm font-bold text-brand-700 dark:text-brand-300"
                >
                  {w}
                </span>
              ))}
            </div>
            <textarea
              value={writingText}
              onChange={(e) => setWritingText(e.target.value)}
              disabled={!!feedback || gradingWriting}
              placeholder="Escribe en español…"
              rows={3}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="w-full text-lg px-5 py-4 rounded-2xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-paper-dark-soft text-ink dark:text-white shadow-card dark:shadow-card-dark focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 transition-all resize-none"
            />
            {!feedback && (
              <>
                <button
                  onClick={submitWriting}
                  disabled={!writingText.trim() || gradingWriting}
                  className="mt-6 btn-primary w-full py-4"
                >
                  {gradingWriting ? 'Checking…' : 'CHECK'}
                </button>
                {/* Free composition is the exercise most likely to stall
                    someone completely — there's no single word to half-recall,
                    so "I can't start this" is a real state. */}
                <IDontKnowButton
                  disabled={gradingWriting}
                  onClick={() =>
                    skipTyped(
                      current.writingPrompt
                        ? `Try using: ${current.writingPrompt.suggested.join(', ')}`
                        : ''
                    )
                  }
                />
              </>
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
          role="status"
          aria-live="assertive"
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
                <Icon name={feedback.kind === 'correct' ? 'check' : 'close'} size={26} />
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
                      ? `¡Excelente! ${combo} in a row`
                      : '¡Correcto!'
                    : 'Not quite'}
                </p>
                {feedback.kind === 'correct' && feedback.note && (
                  <p className="text-sm text-brand-700 dark:text-brand-200 mt-1">{feedback.note}</p>
                )}
                {feedback.kind === 'wrong' && feedback.correctAnswer && (
                  <div className="text-sm text-terra-600 dark:text-terra-300 mt-1">
                    <p>
                      {current.type === 'write_answer' ? 'A natural way to say it: ' : 'Correct answer: '}
                      <span className="font-bold">{feedback.correctAnswer}</span>
                    </p>
                    {feedback.note && (
                      <p className="mt-1.5 bg-white/60 dark:bg-black/20 rounded-lg px-3 py-2 leading-snug">
                        <Icon name="sparkle" size={15} className="inline align-[-2px] mr-1" />
                        {feedback.note}
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
