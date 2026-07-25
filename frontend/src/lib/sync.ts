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
import { isAuthenticated } from './auth';
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
  pulledThisSession = false;
}

async function pushNow(): Promise<void> {
  if (!isAuthenticated()) return;
  const blob = localBlob();

  // Never let an empty device overwrite a full account. PUT /state replaces
  // the stored blob outright, so pushing "no progress" before this session
  // has pulled would destroy the server's copy — the one backup that can
  // restore a learner whose localStorage was cleared. A device with nothing
  // to say has nothing worth saying; wait until syncOnLoad has merged the
  // real state in first.
  const hasAnythingToSave =
    Object.keys(blob.progress?.lessons ?? {}).length > 0 ||
    Object.keys(blob.progress?.words ?? {}).length > 0 ||
    !!blob.tutorProfile;
  if (!pulledThisSession && !hasAnythingToSave) return;

  try {
    await api.put('/state', { data: blob });
  } catch {
    /* offline or endpoint not ready — local state is untouched, retry later */
  }
}

/** Debounced push — call after any local state change. */
export function scheduleSync(delayMs = 1500): void {
  if (typeof window === 'undefined' || !isAuthenticated()) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushNow();
  }, delayMs);
}

/**
 * Pull the account's state, merge it into what's on this device, save the
 * union locally, and push the union back so the server holds everything too.
 * Runs at most once per page-load session.
 */
export async function syncOnLoad(): Promise<void> {
  if (typeof window === 'undefined' || !isAuthenticated() || pulledThisSession) return;
  pulledThisSession = true;
  try {
    const res = await api.get('/state');
    const remote: SyncBlob = res.data?.data ?? {};
    const merged = mergeBlob(localBlob(), remote);
    applyBlob(merged);
    // Notify listeners (e.g. the lessons page) that local state changed.
    window.dispatchEvent(new CustomEvent('aprende-sync'));
    await pushNow();
  } catch {
    pulledThisSession = false; // allow a retry on the next navigation
  }
}

/** Mark onboarding complete and sync it. */
export function markOnboardingComplete(): void {
  writeOnboarding(true);
  scheduleSync(300);
}
