/**
 * Regression coverage for a real bug: logging into a different account on a
 * browser that still had a previous account's progress in localStorage was
 * silently merging the two accounts' data together (mergeProgress/mergeProfile
 * are additive by design). login()/register() must wipe local learner state
 * the moment they detect the signed-in account has changed, before
 * syncOnLoad ever gets a chance to merge stale local data into the new
 * account's server-side state.
 */
jest.mock('../api', () => ({
  api: { post: jest.fn() },
}));

import { useAuth } from '../store';
import { api } from '../api';
import { PROGRESS_KEY, LAST_USER_ID_KEY } from '../keys';

const mockedPost = api.post as jest.Mock;

function mockLoginResponse(userId: string) {
  mockedPost.mockResolvedValueOnce({
    data: {
      tokens: { accessToken: `token-${userId}`, refreshToken: `refresh-${userId}` },
      user: { id: userId, email: `${userId}@test.com`, currentLevel: 1 },
    },
  });
}

describe('login account-switch guard', () => {
  beforeEach(() => {
    localStorage.clear();
    mockedPost.mockReset();
  });

  it('leaves local progress untouched when the same account logs in again', async () => {
    localStorage.setItem(LAST_USER_ID_KEY, 'user-a');
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ streak: 7 }));

    mockLoginResponse('user-a');
    await useAuth.getState().login('a@test.com', 'password');

    expect(localStorage.getItem(PROGRESS_KEY)).toBe(JSON.stringify({ streak: 7 }));
  });

  it('wipes local progress when a DIFFERENT account logs in on this device', async () => {
    localStorage.setItem(LAST_USER_ID_KEY, 'user-a');
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ streak: 7 }));

    mockLoginResponse('user-b');
    await useAuth.getState().login('b@test.com', 'password');

    expect(localStorage.getItem(PROGRESS_KEY)).toBeNull();
    expect(localStorage.getItem(LAST_USER_ID_KEY)).toBe('user-b');
  });

  it('does not wipe anything on a brand-new device with no prior account', async () => {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ streak: 3 }));

    mockLoginResponse('user-a');
    await useAuth.getState().login('a@test.com', 'password');

    // No LAST_USER_ID_KEY was ever set, so there's nothing to detect a
    // switch against — this is a first login on this device, not a switch.
    expect(localStorage.getItem(PROGRESS_KEY)).toBe(JSON.stringify({ streak: 3 }));
  });
});
