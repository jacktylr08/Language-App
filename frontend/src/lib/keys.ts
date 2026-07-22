/**
 * localStorage keys shared across the progress, tutor-memory and sync modules.
 * Kept in their own dependency-free module so those modules can reference the
 * same keys without importing each other (which would create cycles).
 */
export const PROGRESS_KEY = 'aprende-progress-v1';
export const TUTOR_PROFILE_KEY = 'aprende-tutor-profile-v1';
export const ONBOARDING_KEY = 'aprende-onboarding-v1';
export const LEARNER_GOAL_KEY = 'aprende-learner-goal-v1';
export const TUTOR_VOICE_KEY = 'aprende-tutor-voice-v1';
// Tracks which account's data is currently sitting in the keys above, so a
// login as a DIFFERENT account on the same browser/device can detect the
// mismatch and wipe the previous account's local state before syncOnLoad
// ever runs — otherwise its additive (union) merge would permanently blend
// the old account's progress into the new account's server-side row.
export const LAST_USER_ID_KEY = 'aprende-last-user-id';
