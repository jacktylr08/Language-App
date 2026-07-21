/**
 * Practical "can-do" progress — measuring learning by real abilities
 * ("introduce yourself", "order food", "talk about your day") instead of XP or
 * streaks. Each course week becomes a milestone; its status comes from the
 * lessons the learner has actually completed.
 */
import { curriculum, type CurriculumLesson } from './curriculum';
import { loadProgress } from './progress';
import { canDoGoal } from './tutor-context';

export interface Ability {
  week: number;
  /** e.g. "Greet someone and introduce yourself; talk about your family" */
  statement: string;
  /** An example Spanish phrase from the week, for flavour. */
  example: string;
  status: 'can-do' | 'learning' | 'locked';
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function getAbilities(): Ability[] {
  const progress = loadProgress();
  const completed = new Set(
    Object.entries(progress.lessons)
      .filter(([, r]) => r.completed)
      .map(([slug]) => slug)
  );

  // Group lessons by week.
  const byWeek = new Map<number, CurriculumLesson[]>();
  for (const l of curriculum) {
    const arr = byWeek.get(l.week);
    if (arr) arr.push(l);
    else byWeek.set(l.week, [l]);
  }
  const weeks = [...byWeek.keys()].sort((a, b) => a - b);

  // The week the learner is on: the first with an unfinished lesson.
  const currentWeek =
    weeks.find((w) => byWeek.get(w)!.some((l) => !completed.has(l.slug))) ??
    weeks[weeks.length - 1];

  return weeks.map((week) => {
    const lessons = byWeek.get(week)!;
    const goals = Array.from(new Set(lessons.map((l) => canDoGoal(l.theme))));
    const statement = capitalize(goals.join('; '));
    const firstWord = lessons.find((l) => l.vocab.length)?.vocab[0];
    const example = firstWord ? `${firstWord.es} — ${firstWord.en}` : '';

    const allDone = lessons.every((l) => completed.has(l.slug));
    let status: Ability['status'];
    if (allDone) status = 'can-do';
    else if (week < currentWeek) status = 'can-do';
    else if (week === currentWeek) status = 'learning';
    else status = 'locked';

    return { week, statement, example, status };
  });
}

/** Quick tally for headline copy ("You can do 4 things in Spanish"). */
export function abilitiesSummary(): { canDo: number; learning: number; total: number } {
  const all = getAbilities();
  return {
    canDo: all.filter((a) => a.status === 'can-do').length,
    learning: all.filter((a) => a.status === 'learning').length,
    total: all.length,
  };
}
