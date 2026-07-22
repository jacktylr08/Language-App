/**
 * What the learner told us they're here for, captured once at onboarding.
 * Feeds the tutor's personalization — a call for someone learning to travel
 * should read differently from one for someone chasing real conversation.
 */
import { LEARNER_GOAL_KEY } from './keys';
import { scheduleSync } from './sync';

export type LearnerGoal = 'conversation' | 'travel' | 'culture' | 'general';

export const GOAL_LABELS: Record<LearnerGoal, string> = {
  conversation: 'Have conversations in Spanish',
  travel: 'Prepare for travel',
  culture: 'Understand Spanish culture',
  general: 'General learning',
};

function isLearnerGoal(v: unknown): v is LearnerGoal {
  return v === 'conversation' || v === 'travel' || v === 'culture' || v === 'general';
}

export function loadLearnerGoal(): LearnerGoal | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LEARNER_GOAL_KEY);
    return isLearnerGoal(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function saveLearnerGoal(goal: LearnerGoal): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LEARNER_GOAL_KEY, goal);
    scheduleSync();
  } catch {
    /* storage full/unavailable — just won't persist */
  }
}
