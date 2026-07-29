/**
 * Guest mode — using Fluenta before creating an account.
 *
 * Every route in the app called useRequireAuth and bounced a visitor to
 * /login. So the only thing a stranger could ever see was a landing page
 * making claims about itself. Duolingo, by contrast, lets you do a placement
 * test and several full lessons before it ever mentions an email address —
 * and that is not generosity, it's the single highest-leverage thing in their
 * funnel. Asking for a signup before delivering any value is asking someone
 * to trust a promise from software they've never used.
 *
 * This works because of a happy accident of the existing architecture:
 * progress already lives in localStorage and is only *mirrored* to the server
 * by sync.ts. A guest is therefore a completely normal learner whose state
 * simply never gets pushed — no separate code path through the lesson engine,
 * no shadow data model.
 *
 * The conversion moment is deliberately at the end of a lesson, when the
 * learner has something to lose: "create an account to keep this". That is a
 * far better offer than "create an account to begin".
 */

import { GUEST_KEY } from './keys';
import { isAuthenticated } from './auth';

/** How much a guest may do before the app insists on an account. */
export const GUEST_LESSON_LIMIT = 2;

export function isGuest(): boolean {
  if (typeof window === 'undefined') return false;
  // A real account always wins — the flag is stale the moment they sign in.
  if (isAuthenticated()) return false;
  return localStorage.getItem(GUEST_KEY) === 'on';
}

/** Called when a visitor chooses to try the app rather than sign up. */
export function beginGuest(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GUEST_KEY, 'on');
}

/**
 * Cleared once they have a real account. Deliberately does NOT touch the
 * progress keys: everything they did as a guest is theirs, and sync.ts's
 * merge is additive, so it lands on the new account on first push.
 */
export function endGuest(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(GUEST_KEY);
}

/**
 * True once a guest has had a genuine taste and it's fair to ask for an
 * account. Not a paywall — the point is that they've felt the value first.
 */
export function guestShouldConvert(lessonsDone: number): boolean {
  return isGuest() && lessonsDone >= GUEST_LESSON_LIMIT;
}
