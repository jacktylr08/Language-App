/**
 * localStorage keys shared across the progress, tutor-memory and sync modules.
 * Kept in their own dependency-free module so those modules can reference the
 * same keys without importing each other (which would create cycles).
 */
export const PROGRESS_KEY = 'aprende-progress-v1';
export const TUTOR_PROFILE_KEY = 'aprende-tutor-profile-v1';
export const ONBOARDING_KEY = 'aprende-onboarding-v1';
export const LEARNER_GOAL_KEY = 'aprende-learner-goal-v1';
