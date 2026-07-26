/**
 * The guarantees a learner actually cares about: progress lives in the
 * database, so signing out doesn't lose it, a new device gets it back, and
 * two devices can't erase each other.
 */
jest.mock('../api', () => ({ api: { get: jest.fn(), put: jest.fn() } }));
jest.mock('../auth', () => ({
  isAuthenticated: () => true,
  getAuth: () => ({ accessToken: 'token', refreshToken: 'r', user: { id: 'u1' } }),
}));

import { api } from '../api';
import { PROGRESS_KEY } from '../keys';
import type { ProgressState } from '../progress';

const get = api.get as jest.Mock;
const put = api.put as jest.Mock;

function progressWith(lessons: string[], streak = 0): ProgressState {
  return {
    streak,
    bestStreak: streak,
    lastActiveDay: '',
    activeDays: [],
    lessons: Object.fromEntries(
      lessons.map((slug) => [slug, { completed: true, bestAccuracy: 90, timesCompleted: 1 }])
    ),
    words: {},
  };
}

function localProgress(): ProgressState | null {
  const raw = localStorage.getItem(PROGRESS_KEY);
  return raw ? JSON.parse(raw) : null;
}

/** Fresh module registry each time so sync.ts's session state doesn't leak between tests. */
async function freshSync() {
  let mod!: typeof import('../sync');
  await jest.isolateModulesAsync(async () => {
    mod = await import('../sync');
  });
  return mod;
}

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  put.mockResolvedValue({ data: { ok: true, version: 2 } });
});

describe('signing in on a device with no local data', () => {
  it('restores progress from the server', async () => {
    // Exactly the "signed out, or a brand-new phone" case: nothing local.
    get.mockResolvedValue({
      data: { data: { progress: progressWith(['a', 'b', 'c'], 4) }, version: 7 },
    });

    const sync = await freshSync();
    await sync.syncOnLoad();

    expect(Object.keys(localProgress()!.lessons)).toEqual(['a', 'b', 'c']);
    expect(localProgress()!.streak).toBe(4);
  });

  it('does not push an empty blob back over the top of the account', async () => {
    get.mockResolvedValue({
      data: { data: { progress: progressWith(['a', 'b']) }, version: 3 },
    });

    const sync = await freshSync();
    await sync.syncOnLoad();

    // Nothing local to contribute, so there is nothing to write back.
    expect(put).not.toHaveBeenCalled();
  });
});

describe('a device that has done work offline', () => {
  it('merges local and server progress, keeping both', async () => {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progressWith(['local-only'])));
    get.mockResolvedValue({
      data: { data: { progress: progressWith(['server-only']) }, version: 1 },
    });

    const sync = await freshSync();
    await sync.syncOnLoad();

    expect(Object.keys(localProgress()!.lessons).sort()).toEqual(['local-only', 'server-only']);
    // And the union goes back up, so the server holds everything too.
    expect(put).toHaveBeenCalled();
  });
});

describe('two devices writing at once', () => {
  it('merges instead of clobbering when the server rejects a stale write', async () => {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progressWith(['mine'])));
    get.mockResolvedValue({ data: { data: {}, version: 5 } });

    const sync = await freshSync();
    await sync.syncOnLoad();
    jest.clearAllMocks();

    // The other device saved in the meantime; our next write is stale.
    put
      .mockRejectedValueOnce({
        response: {
          status: 409,
          data: { conflict: true, data: { progress: progressWith(['theirs']) }, version: 9 },
        },
      })
      .mockResolvedValueOnce({ data: { ok: true, version: 10 } });

    await sync.flushSync();

    // Their lesson was pulled in rather than overwritten, and ours survives.
    expect(Object.keys(localProgress()!.lessons).sort()).toEqual(['mine', 'theirs']);
    // Retried against the version the server actually reported.
    expect(put).toHaveBeenLastCalledWith('/state', expect.objectContaining({ baseVersion: 9 }));
  });
});

describe('flushSync', () => {
  it('pushes immediately rather than waiting out the debounce', async () => {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progressWith(['done'])));
    get.mockResolvedValue({ data: { data: {}, version: 1 } });

    const sync = await freshSync();
    await sync.syncOnLoad();
    jest.clearAllMocks();

    sync.scheduleSync(); // would normally sit for 1.5s
    await sync.flushSync();

    // This is what stops "finish a lesson, sign out immediately" losing it.
    expect(put).toHaveBeenCalled();
  });
});
