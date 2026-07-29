/**
 * Guest mode is the funnel: before it, every route bounced an unregistered
 * visitor to /login, so the only thing a stranger could see of the app was a
 * landing page making claims about itself.
 *
 * The risky part isn't letting them in — it's the boundary with real
 * accounts. A guest must never be mistaken for a signed-in learner, and
 * nothing they did as a guest may be lost when they convert.
 */
jest.mock('../auth', () => ({ isAuthenticated: jest.fn(() => false) }));

import { isGuest, beginGuest, endGuest, guestShouldConvert, GUEST_LESSON_LIMIT } from '../guest';
import { GUEST_KEY, PROGRESS_KEY } from '../keys';
import { isAuthenticated } from '../auth';

const mockAuth = isAuthenticated as jest.Mock;

beforeEach(() => {
  localStorage.clear();
  mockAuth.mockReturnValue(false);
});

describe('starting as a guest', () => {
  it('is off by default — a fresh visitor is not silently a guest', () => {
    expect(isGuest()).toBe(false);
  });

  it('turns on when the visitor chooses to try a lesson', () => {
    beginGuest();
    expect(isGuest()).toBe(true);
    expect(localStorage.getItem(GUEST_KEY)).toBe('on');
  });
});

describe('the boundary with a real account', () => {
  it('a signed-in learner is never a guest, even with a stale flag', () => {
    // The flag can outlive a sign-in (they converted in another tab, or the
    // flag was never cleared). A real account must always win, or a paying
    // learner gets shown "save your progress" prompts forever.
    beginGuest();
    mockAuth.mockReturnValue(true);
    expect(isGuest()).toBe(false);
  });

  it('clearing guest mode does NOT touch their progress', () => {
    // Everything they did as a guest is theirs. sync.ts's merge is additive,
    // so leaving it in place is exactly what carries it onto the new account.
    beginGuest();
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ streak: 3, words: { hola: {} } }));

    endGuest();

    expect(localStorage.getItem(GUEST_KEY)).toBeNull();
    expect(JSON.parse(localStorage.getItem(PROGRESS_KEY)!).streak).toBe(3);
  });
});

describe('when to ask for an account', () => {
  it('does not ask before they have done anything', () => {
    beginGuest();
    expect(guestShouldConvert(0)).toBe(false);
  });

  it('asks once they have finished enough to have something to lose', () => {
    beginGuest();
    expect(guestShouldConvert(GUEST_LESSON_LIMIT)).toBe(true);
  });

  it('never asks a signed-in learner', () => {
    mockAuth.mockReturnValue(true);
    expect(guestShouldConvert(99)).toBe(false);
  });

  it('never asks someone who isn’t a guest at all', () => {
    expect(guestShouldConvert(99)).toBe(false);
  });
});
