import { useCallback, useEffect, useState } from 'react';
import type { CurriculumLesson, VocabItem } from '@/lib/curriculum';
import { Exercise, buildLessonSession, buildReviewSession, buildMistakesSession, buildRetry, recallKindFor } from '@/lib/exercise-engine';
import { touchStreak, completeLessonLocal, recordWordResult, recordPronunciationResult } from '@/lib/progress';
import { speakNeural as speak, stopSpeaking } from '@/lib/tts';
import { saveCheckpoint, loadCheckpoint, clearCheckpoint } from '@/lib/lesson-resume';
import type { Feedback } from './types';

export interface SessionStats {
  answered: number;
  firstTryCorrect: number;
  bestCombo: number;
}

interface UseLessonSessionArgs {
  lesson: CurriculumLesson | null;
  mode: 'lesson' | 'practice' | 'mistakes';
  srAvailable: boolean;
  allVocab: VocabItem[];
}

/**
 * The core session "engine": building the exercise queue, tracking position/
 * score, grading an answer against FSRS + the pronunciation signal, and
 * advancing to the next exercise (or finishing). Deliberately does NOT own
 * any exercise-type-specific UI state (typed text, mic state, picked tiles,
 * match-pairs selection, etc.) — that stays with the exercise-type
 * rendering in LessonEngine itself, since it's tightly coupled to how each
 * exercise type is drawn, not to the session's own progress.
 */
export function useLessonSession({ lesson, mode, srAvailable, allVocab }: UseLessonSessionArgs) {
  const [queue, setQueue] = useState<Exercise[]>([]);
  const [built, setBuilt] = useState(false);
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [combo, setCombo] = useState(0);
  const [stats, setStats] = useState<SessionStats>({ answered: 0, firstTryCorrect: 0, bestCombo: 0 });
  const [finished, setFinished] = useState(false);
  /** Set when this lesson was interrupted and can be picked back up. */
  const [resumable, setResumable] = useState<{ index: number; total: number } | null>(null);

  const current = queue[index];
  const total = queue.length;

  useEffect(() => {
    if (mode === 'mistakes') {
      setQueue(buildMistakesSession(srAvailable));
    } else if (mode === 'practice') {
      setQueue(buildReviewSession(null, srAvailable));
    } else if (lesson) {
      // A saved queue wins over a freshly built one — the queue is shuffled
      // at build time, so rebuilding and jumping to the saved index would
      // drop the learner into a different lesson at an arbitrary point.
      const saved = loadCheckpoint(lesson.slug);
      if (saved) {
        setQueue(saved.queue);
        setResumable({ index: saved.index, total: saved.queue.length });
      } else {
        setQueue(buildLessonSession(lesson, srAvailable));
      }
    }
    setBuilt(true);
  }, [lesson, mode, srAvailable]);

  /**
   * Take up the saved position. Called from the start screen rather than
   * automatically, so the learner is told where they are instead of being
   * dropped into the middle of a lesson with no explanation.
   */
  const resume = useCallback(() => {
    if (!lesson) return;
    const saved = loadCheckpoint(lesson.slug);
    if (!saved) return;
    setQueue(saved.queue);
    setIndex(saved.index);
    setStats(saved.stats);
    setCombo(saved.combo);
    setStarted(true);
  }, [lesson]);

  /** Start over, discarding the saved position. */
  const restart = useCallback(() => {
    if (!lesson) return;
    clearCheckpoint(lesson.slug);
    setQueue(buildLessonSession(lesson, srAvailable));
    setIndex(0);
    setStats({ answered: 0, firstTryCorrect: 0, bestCombo: 0 });
    setCombo(0);
    setResumable(null);
    setStarted(true);
  }, [lesson, srAvailable]);

  const grade = useCallback(
    (correct: boolean, correctAnswer: string, note?: string) => {
      if (!current) return;
      const firstTry = !current.isRetry;
      if (!current.noWordTracking) {
        recordWordResult(current.word.id, correct, firstTry, recallKindFor(current.type));
        // Speaking exercises also feed the pronunciation signal the tutor uses.
        if (current.type === 'speak') recordPronunciationResult(current.word.id, correct);
      }

      if (correct) {
        const comboNext = combo + 1;
        touchStreak();
        setCombo(comboNext);
        setStats((s) => ({
          answered: s.answered + 1,
          firstTryCorrect: s.firstTryCorrect + (firstTry ? 1 : 0),
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
      if (mode === 'lesson' && lesson) {
        completeLessonLocal(lesson.slug, accuracy);
        clearCheckpoint(lesson.slug);
      } else touchStreak(); // practice/mistakes: touch streak even if all skipped
      setFinished(true);
    } else {
      const nextIndex = index + 1;
      setIndex(nextIndex);
      // Checkpoint on every advance, not on unload: a phone that's been
      // backgrounded and reclaimed by iOS never fires an unload event, and
      // that's the single most common way a lesson gets abandoned.
      if (mode === 'lesson' && lesson) {
        saveCheckpoint({ slug: lesson.slug, queue, index: nextIndex, stats, combo });
      }
    }
  }, [index, total, stats, lesson, mode, queue, combo]);

  return {
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
  };
}
