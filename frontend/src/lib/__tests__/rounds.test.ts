/**
 * Lessons run 50–59 exercises, about eleven minutes, with no stopping point
 * in them. The length was never really the problem — the absence of a finish
 * line inside it was, because someone with four spare minutes can't start an
 * eleven-minute thing, and on a busy day they don't open the app at all.
 */
import { splitIntoRounds, type Exercise, type ExerciseType } from '../exercise-engine';
import { curriculum } from '../curriculum/es';
import { buildLessonSession } from '../exercise-engine';

function ex(type: ExerciseType, id = 'w'): Exercise {
  return {
    type,
    word: { id, es: 'palabra', en: 'word', pron: '', exampleEs: '', exampleEn: '' },
  };
}

describe('splitting a session into rounds', () => {
  it('returns nothing for an empty queue', () => {
    expect(splitIntoRounds([])).toEqual([]);
  });

  it('keeps a short session as a single round', () => {
    const rounds = splitIntoRounds(Array.from({ length: 8 }, () => ex('type_es')));
    expect(rounds).toHaveLength(1);
  });

  it('loses no exercises and reorders nothing', () => {
    const queue = Array.from({ length: 55 }, (_, i) => ex('type_es', `w${i}`));
    const flat = splitIntoRounds(queue).flat();
    expect(flat).toHaveLength(queue.length);
    expect(flat.map((e) => e.word.id)).toEqual(queue.map((e) => e.word.id));
  });

  it('ends a round on something the learner answered, not on a teach card', () => {
    // Stopping someone on "here's some information" is a much weaker place to
    // leave them than "you got that right".
    const queue: Exercise[] = [];
    for (let i = 0; i < 40; i++) {
      // Teach cards clustered exactly where a naive 13-item boundary lands.
      queue.push(i === 12 || i === 13 ? ex('teach', `t${i}`) : ex('type_es', `w${i}`));
    }
    const ungraded = new Set(['teach', 'grammar_slide', 'dialogue_slide']);
    for (const round of splitIntoRounds(queue).slice(0, -1)) {
      expect(ungraded.has(round[round.length - 1].type)).toBe(false);
    }
  });

  it('never leaves a stray one-or-two-question final round', () => {
    // "Round 5 of 5" being two questions is worse than a slightly long round 4.
    for (let n = 14; n <= 60; n++) {
      const rounds = splitIntoRounds(Array.from({ length: n }, () => ex('type_es')));
      expect(rounds[rounds.length - 1].length).toBeGreaterThan(3);
    }
  });

  it('makes rounds short enough to actually fit in a gap', () => {
    const rounds = splitIntoRounds(Array.from({ length: 55 }, () => ex('type_es')));
    expect(rounds.length).toBeGreaterThanOrEqual(3);
    // ~13 items is about three minutes; the merged final round can run over.
    for (const round of rounds) expect(round.length).toBeLessThanOrEqual(20);
  });
});

describe('every real lesson gets usable rounds', () => {
  const lessons = curriculum.filter((l) => !l.isReview);

  it('splits each one into several stopping points', () => {
    for (const lesson of lessons) {
      const rounds = splitIntoRounds(buildLessonSession(lesson, true));
      expect(rounds.length).toBeGreaterThanOrEqual(3);
      expect(rounds.flat().length).toBe(buildLessonSession(lesson, true).length);
    }
  });

  it('gives a consistent number of rounds across the course', () => {
    // Wildly varying round counts would make "3 rounds" meaningless as a
    // promise about how long a lesson takes.
    const counts = lessons.map((l) => splitIntoRounds(buildLessonSession(l, true)).length);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(2);
  });
});
