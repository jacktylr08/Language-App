/**
 * Self-reported starting level, captured once at onboarding. Maps directly
 * onto the course's own 6 phases (see phaseForWeek in curriculum.ts — 4
 * weeks each) so "I'm intermediate" has a concrete, defensible meaning: the
 * learner is placed at the start of the phase that matches, and every
 * earlier lesson is marked `skipped` (see placeLearnerAtWeek in progress.ts)
 * — never faked as `completed`.
 */
export type LearnerLevel = 'new' | 'beginner' | 'intermediate' | 'advanced';

export interface LevelOption {
  value: LearnerLevel;
  label: string;
  description: string;
}

export const LEVEL_OPTIONS: LevelOption[] = [
  {
    value: 'new',
    label: 'Complete beginner',
    description: "I know a few words at most — start me from zero.",
  },
  {
    value: 'beginner',
    label: 'Some basics',
    description: 'I know greetings, numbers, a handful of simple phrases.',
  },
  {
    value: 'intermediate',
    label: 'Conversational',
    description: 'I can get by in basic conversations, but I make a lot of mistakes.',
  },
  {
    value: 'advanced',
    label: 'Advanced',
    description: "I'm fairly fluent — I want to refine and practice.",
  },
];

/** The course week a self-reported level should start at. 1 = no skip. */
export function startWeekForLevel(level: LearnerLevel): number {
  switch (level) {
    case 'beginner':
      return 5; // skip Phase 1 (Foundations)
    case 'intermediate':
      return 13; // skip Phases 1-3 (through The Past & Future)
    case 'advanced':
      return 21; // skip Phases 1-5 (through Power Grammar)
    default:
      return 1; // complete beginner — nothing to skip
  }
}
