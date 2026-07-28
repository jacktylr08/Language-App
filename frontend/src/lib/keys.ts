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
// The account's chosen course language (see lib/languages.ts).
export const ACTIVE_LANGUAGE_KEY = 'aprende-active-language';
// Sound and haptic feedback preferences (see lib/feedback.ts). Device-local:
// whether you want sound on is a property of the phone you're holding — and
// of where you are — not of the account.
export const SOUND_KEY = 'aprende-sound-v1';
export const HAPTICS_KEY = 'aprende-haptics-v1';
// An interrupted lesson's position, so it can be resumed rather than
// restarted (see lib/lesson-resume.ts). Deliberately device-local and NOT
// synced — a half-finished lesson belongs to the phone you left it on.
export const LESSON_CHECKPOINT_KEY = 'aprende-lesson-checkpoint-v1';

// Spanish ('es') is the original, default course — its data keeps the exact
// existing key names so no current learner's progress ever needs migrating.
// Any OTHER language gets its own namespaced key, so a future second course
// can never mix with or overwrite Spanish data (or vice versa).
const DEFAULT_LANGUAGE_ID = 'es';

/** Progress (lessons/words) is per-language — different courses, different vocab. */
export function progressKeyFor(languageId: string): string {
  return languageId === DEFAULT_LANGUAGE_ID ? PROGRESS_KEY : `${PROGRESS_KEY}-${languageId}`;
}

/** Tutor memory (weaknesses/strengths/history) is per-language — mistakes in French aren't mistakes in Spanish. */
export function tutorProfileKeyFor(languageId: string): string {
  return languageId === DEFAULT_LANGUAGE_ID ? TUTOR_PROFILE_KEY : `${TUTOR_PROFILE_KEY}-${languageId}`;
}
