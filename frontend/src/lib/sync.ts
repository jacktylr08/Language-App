/**
 * Cross-device sync.
 *
 * The app keeps its state (learning progress + tutor memory + onboarding flag)
 * in localStorage for instant, offline-friendly reads. This module mirrors that
 * to the account via GET/PUT /api/v1/state so the same login shares one brain
 * across laptop and phone.
 *
 * Merges are deliberately idempotent (max / union / OR), so pulling and pushing
 * repeatedly — or using two devices at once — can only ever ADD progress, never
 * wipe it.
 */
import { api } from './api';
import { getAuth, isAuthenticated } from './auth';
import { progressKeyFor, tutorProfileKeyFor, ONBOARDING_KEY, LEARNER_GOAL_KEY, ACTIVE_LANGUAGE_KEY } from './keys';
import { LANGUAGES, getActiveLanguageId } from './languages';
import type { ProgressState } from './progress';
import type { LearnerProfile } from './tutor-memory';
import type { LearnerGoal } from './learner-goal';

interface SyncBlob {
  progress?: ProgressState;
  tutorProfile?: LearnerProfile | null;
  onboardingComplete?: boolean;
  learnerGoal?: LearnerGoal | null;
}

// ---------- localStorage helpers (read/write raw, no cross-imports) ----------

function readJSON<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function readOnboarding(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeOnboarding(done: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (done) localStorage.setItem(ONBOARDING_KEY, 'true');
  } catch {
    /* ignore */
  }
}

function readGoal(): LearnerGoal | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LEARNER_GOAL_KEY);
    return raw === 'conversation' || raw === 'travel' || raw === 'culture' || raw === 'general'
      ? raw
      : null;
  } catch {
    return null;
  }
}

function writeGoal(goal: LearnerGoal): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LEARNER_GOAL_KEY, goal);
  } catch {
    /* ignore */
  }
}

// Syncs only the ACTIVE language's progress/tutor memory. With a single
// registered language this is everything there is to sync; once a second
// language exists, syncing every language at once would need the server's
// state blob to become language-keyed too (POST /api/v1/state currently
// stores one flat blob per account) — a backend change, out of scope here.
function localBlob(): SyncBlob {
  const languageId = getActiveLanguageId();
  return {
    progress: readJSON<ProgressState>(progressKeyFor(languageId)) ?? undefined,
    tutorProfile: readJSON<LearnerProfile>(tutorProfileKeyFor(languageId)),
    onboardingComplete: readOnboarding(),
    learnerGoal: readGoal(),
  };
}

// ---------- merges (idempotent) ----------

const later = (a?: string, b?: string): string => ((a || '') >= (b || '') ? a || '' : b || '');

// Exported (not just used internally) so the merge semantics — the part of
// this module where a bug could silently corrupt or drop a learner's data —
// can be unit tested directly.
export function mergeProgress(a?: ProgressState, b?: ProgressState): ProgressState | undefined {
  if (!a) return b;
  if (!b) return a;

  const lessons: ProgressState['lessons'] = { ...a.lessons };
  for (const [slug, rb] of Object.entries(b.lessons || {})) {
    const ra = lessons[slug];
    lessons[slug] = ra
      ? {
          completed: ra.completed || rb.completed,
          bestAccuracy: Math.max(ra.bestAccuracy, rb.bestAccuracy),
          timesCompleted: Math.max(ra.timesCompleted, rb.timesCompleted),
          lastCompleted: later(ra.lastCompleted, rb.lastCompleted) || undefined,
        }
      : rb;
  }

  const words: ProgressState['words'] = { ...a.words };
  for (const [id, wb] of Object.entries(b.words || {})) {
    const wa = words[id];
    words[id] = wa
      ? {
          strength: Math.max(wa.strength, wb.strength),
          correct: Math.max(wa.correct, wb.correct),
          wrong: Math.max(wa.wrong, wb.wrong),
          lastSeen: later(wa.lastSeen, wb.lastSeen),
          nextReview: later(wa.nextReview, wb.nextReview),
          // Whichever side has more actual FSRS review history is the more
          // trustworthy scheduling state — losing it on merge would reset the
          // word to "brand new" on its next review.
          fsrs: (wb.fsrs?.reps ?? -1) > (wa.fsrs?.reps ?? -1) ? wb.fsrs : wa.fsrs,
        }
      : wb;
  }

  const activeDays = Array.from(new Set([...(a.activeDays || []), ...(b.activeDays || [])]))
    .sort()
    .slice(-60);

  return {
    streak: Math.max(a.streak, b.streak),
    bestStreak: Math.max(a.bestStreak, b.bestStreak),
    lastActiveDay: later(a.lastActiveDay, b.lastActiveDay),
    activeDays,
    lessons,
    words,
  };
}

export function mergeProfile(
  a?: LearnerProfile | null,
  b?: LearnerProfile | null
): LearnerProfile | null {
  if (!a) return b ?? null;
  if (!b) return a ?? null;
  // The reflect step already merges content into the profile; the fresher one
  // wins for the scalar fields (summary/strengths/weaknesses/reviews/etc).
  const winner = (a.updatedAt || '') >= (b.updatedAt || '') ? a : b;

  // History is additive across devices though — union by date so a session
  // logged on one device is never lost when the other device's profile wins.
  const seen = new Set<string>();
  const history = [...(a.history ?? []), ...(b.history ?? [])]
    .filter((h) => {
      if (seen.has(h.date)) return false;
      seen.add(h.date);
      return true;
    })
    .sort((x, y) => (x.date < y.date ? 1 : -1))
    .slice(0, 20);

  return { ...winner, history };
}

function mergeBlob(a: SyncBlob, b: SyncBlob): SyncBlob {
  return {
    progress: mergeProgress(a.progress, b.progress),
    tutorProfile: mergeProfile(a.tutorProfile, b.tutorProfile),
    onboardingComplete: !!(a.onboardingComplete || b.onboardingComplete),
    // Set once at onboarding and rarely revisited — first non-empty value wins.
    learnerGoal: a.learnerGoal ?? b.learnerGoal ?? null,
  };
}

function applyBlob(blob: SyncBlob): void {
  const languageId = getActiveLanguageId();
  if (blob.progress) writeJSON(progressKeyFor(languageId), blob.progress);
  if (blob.tutorProfile) writeJSON(tutorProfileKeyFor(languageId), blob.tutorProfile);
  if (blob.onboardingComplete) writeOnboarding(true);
  if (blob.learnerGoal) writeGoal(blob.learnerGoal);
}

// ---------- push / pull ----------

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pulledThisSession = false;
/** In-flight (or completed) pull for this page-load, so callers can await it. */
let pullPromise: Promise<void> | null = null;
/** Version the last successful pull/push saw — sent back so the server can reject a stale write. */
let knownVersion: number | null = null;
/** A push currently in flight, so flush() can wait for it rather than racing it. */
let inFlightPush: Promise<void> | null = null;
/** Set when a push failed and still needs to happen. */
let pendingRetry = false;

/** Fired whenever local state changes from a sync, so mounted views can re-read. */
export const SYNC_EVENT = 'aprende-sync';

export type SyncStatus = 'idle' | 'loading' | 'ready' | 'error';
let status: SyncStatus = 'idle';

export function getSyncStatus(): SyncStatus {
  return status;
}

function setStatus(next: SyncStatus): void {
  status = next;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { status: next } }));
  }
}

/**
 * Wipes every piece of local learner state (progress, tutor memory,
 * onboarding flag, learner goal) — used when switching to a different
 * account on this device. Without this, whatever the previous account left
 * in localStorage gets additively merged into the new account's server-side
 * state the next time syncOnLoad runs, permanently blending the two
 * accounts' progress together.
 */
export function clearLocalLearnerState(): void {
  if (typeof window === 'undefined') return;
  // Every registered language, not just the active one — an account switch
  // must never leave a different language's progress behind either.
  for (const lang of LANGUAGES) {
    localStorage.removeItem(progressKeyFor(lang.id));
    localStorage.removeItem(tutorProfileKeyFor(lang.id));
  }
  localStorage.removeItem(ONBOARDING_KEY);
  localStorage.removeItem(LEARNER_GOAL_KEY);
  // Which language an account is studying is itself per-account data — the
  // next account on this device should default fresh, not inherit this one's.
  localStorage.removeItem(ACTIVE_LANGUAGE_KEY);

  // Reset the whole sync session too. Leaving pulledThisSession/knownVersion
  // set would let the NEXT account's first write inherit this account's
  // version and be treated as an up-to-date push of an empty device.
  pulledThisSession = false;
  pullPromise = null;
  knownVersion = null;
  pendingRetry = false;
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  status = 'idle';
}

/**
 * The page-unload flush can't go through the axios client — it needs fetch's
 * `keepalive`, so it builds the request itself and therefore needs the base
 * URL and token directly. Kept in step with lib/api.ts's own default.
 */
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://hospitable-insight-production-550c.up.railway.app/api/v1';

function getAuthToken(): string | null {
  return getAuth()?.accessToken ?? null;
}

function hasAnythingToSave(blob: SyncBlob): boolean {
  return (
    Object.keys(blob.progress?.lessons ?? {}).length > 0 ||
    Object.keys(blob.progress?.words ?? {}).length > 0 ||
    !!blob.tutorProfile
  );
}

async function pushNow(): Promise<void> {
  if (!isAuthenticated()) return;
  const blob = localBlob();

  // Never let an empty device overwrite a full account. A device with nothing
  // to say has nothing worth saying; wait until the pull has merged the real
  // state in first.
  if (!pulledThisSession && !hasAnythingToSave(blob)) return;

  try {
    const res = await api.put('/state', {
      data: blob,
      // Tells the server what this write was based on. Omitted only when we
      // have never seen a version (first ever push), where there is nothing
      // to conflict with.
      ...(knownVersion !== null ? { baseVersion: knownVersion } : {}),
    });
    knownVersion = res.data?.version ?? knownVersion;
    pendingRetry = false;
  } catch (err: any) {
    // 409: another device saved since we pulled. Merge theirs into ours —
    // the merge is a union, so this can only ever ADD — and write again.
    // Without this the slower device would erase the other's progress.
    if (err?.response?.status === 409) {
      const remote: SyncBlob = err.response.data?.data ?? {};
      const merged = mergeBlob(localBlob(), remote);
      applyBlob(merged);
      knownVersion = err.response.data?.version ?? null;
      notifyChanged();
      try {
        const res = await api.put('/state', { data: localBlob(), baseVersion: knownVersion });
        knownVersion = res.data?.version ?? knownVersion;
        pendingRetry = false;
        return;
      } catch {
        pendingRetry = true;
        return;
      }
    }
    // Offline or server trouble — local state is untouched and still the
    // newest thing we have. Mark it so we try again rather than dropping it.
    pendingRetry = true;
  }
}

/** Coalesces concurrent pushes so two callers can't race the same write. */
function pushSerialized(): Promise<void> {
  inFlightPush = (inFlightPush ?? Promise.resolve()).then(pushNow, pushNow);
  return inFlightPush;
}

/** Debounced push — call after any local state change. */
export function scheduleSync(delayMs = 1500): void {
  if (typeof window === 'undefined' || !isAuthenticated()) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushSerialized();
  }, delayMs);
}

/**
 * Push anything outstanding RIGHT NOW and wait for it to land.
 *
 * The debounce above means a learner who finishes a lesson and immediately
 * signs out, closes the tab, or has their session end can lose that write.
 * Anything destructive to local state must await this first.
 */
export async function flushSync(): Promise<void> {
  if (typeof window === 'undefined' || !isAuthenticated()) return;
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  await pushSerialized();
}

function notifyChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { status } }));
  }
}

/**
 * Pull the account's state from the server, merge it into whatever this
 * device has, and save the union both locally and back to the server.
 *
 * The server is the source of truth: a learner signing in on a new device —
 * or the same device after signing out — gets their progress back from here.
 * localStorage is only a fast local cache of it. Runs at most once per
 * page-load; concurrent callers share the same promise so every caller can
 * await the same pull.
 */
export function syncOnLoad(): Promise<void> {
  if (typeof window === 'undefined' || !isAuthenticated()) return Promise.resolve();
  if (pullPromise) return pullPromise;

  setStatus('loading');
  pullPromise = (async () => {
    try {
      const res = await api.get('/state');
      const remote: SyncBlob = res.data?.data ?? {};
      knownVersion = res.data?.version ?? null;

      const merged = mergeBlob(localBlob(), remote);
      applyBlob(merged);
      pulledThisSession = true;
      setStatus('ready');

      // Only push back if this device actually contributed something the
      // server didn't already have. Compared against the remote run through
      // the same normalization, not the raw response — otherwise the shape
      // differences alone (absent vs null) make every sign-in look like a
      // change, writing a new version and a history snapshot each time until
      // the rollback history is nothing but duplicates of the same state.
      const canonicalRemote = mergeBlob({}, remote);
      if (JSON.stringify(merged) !== JSON.stringify(canonicalRemote)) {
        await pushSerialized();
      }
    } catch {
      // Couldn't reach the server. Local state is untouched, so the app still
      // works offline from cache — but this session has NOT confirmed it holds
      // the account's real state, so pushNow stays conservative.
      pulledThisSession = false;
      pullPromise = null; // let a later navigation retry
      setStatus('error');
    }
  })();

  return pullPromise;
}

/**
 * Best-effort flush when the page is going away (tab close, backgrounding on
 * mobile). `keepalive` lets the request outlive the document, which a normal
 * fetch does not — without it, closing the tab right after a lesson loses it.
 */
function flushOnHide(): void {
  if (typeof window === 'undefined' || !isAuthenticated()) return;
  if (!pushTimer && !pendingRetry) return;
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }

  const auth = getAuthToken();
  if (!auth) return;
  try {
    void fetch(`${API_BASE}/state`, {
      method: 'PUT',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth}` },
      body: JSON.stringify({
        data: localBlob(),
        ...(knownVersion !== null ? { baseVersion: knownVersion } : {}),
      }),
    });
  } catch {
    /* nothing more we can do at this point */
  }
}

export function startSyncLifecycle(): () => void {
  if (typeof window === 'undefined') return () => {};
  const onHide = () => {
    if (document.visibilityState === 'hidden') flushOnHide();
  };
  window.addEventListener('pagehide', flushOnHide);
  document.addEventListener('visibilitychange', onHide);
  return () => {
    window.removeEventListener('pagehide', flushOnHide);
    document.removeEventListener('visibilitychange', onHide);
  };
}

/** Mark onboarding complete and sync it. */
export function markOnboardingComplete(): void {
  writeOnboarding(true);
  scheduleSync(300);
}
