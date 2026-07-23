import { useCallback, useEffect, useState } from 'react';
import type { CurriculumLesson, VocabItem } from '@/lib/curriculum';
import { Exercise, buildLessonSession, buildReviewSession, buildMistakesSession, buildRetry, recallKindFor } from '@/lib/exercise-engine';
import { touchStreak, completeLessonLocal, recordWordResult, recordPronunciationResult } from '@/lib/progress';
import { speakNeural as speak, stopSpeaking } from '@/lib/tts';
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

  const current = queue[index];
  const total = queue.length;

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
      if (mode === 'lesson' && lesson) completeLessonLocal(lesson.slug, accuracy);
      else touchStreak(); // practice/mistakes: touch streak even if all skipped
      setFinished(true);
    } else {
      setIndex((i) => i + 1);
    }
  }, [index, total, stats, lesson, mode]);

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
  };
}
