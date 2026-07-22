/**
 * The tutor's memory of one learner — what they're good at, what they keep
 * getting wrong, and a running summary. Persisted in localStorage (and synced
 * to the account via lib/sync so it follows you across devices), and distilled
 * from each conversation by the backend /tutor/reflect endpoint.
 *
 * It also schedules weak spots on a spacing curve, so the tutor deliberately
 * recycles the things you keep getting wrong instead of letting them fade.
 */
import { api } from './api';
import { tutorProfileKeyFor } from './keys';
import { scheduleSync } from './sync';
import { getActiveLanguageId, getLanguage } from './languages';

/** Resolved fresh each call — mistakes in one language aren't mistakes in another. */
function activeKey(): string {
  return tutorProfileKeyFor(getActiveLanguageId());
}

/** A weak spot's review schedule. */
export interface WeaknessReview {
  /** ISO date this weak spot is next due to be recycled. */
  due: string;
  /** How many times running it's come up due and been practised. */
  streak: number;
}

/** One turn of a session transcript. */
export interface TranscriptTurn {
  role: 'user' | 'assistant';
  content: string;
}

/** One completed session, for the "what we've covered" history log. */
export interface SessionEntry {
  /** ISO timestamp of when the session was reflected on. */
  date: string;
  /** One-line diary note for this specific session. */
  note: string;
  /** Concrete mistakes made in this session. */
  mistakes: string[];
  /** True if this session was a periodic evaluation check-in. */
  wasEvaluation?: boolean;
  /**
   * The actual back-and-forth, so the learner can look back at exactly what
   * was said — not just the one-line note. Capped per-session (turns and
   * per-turn length) so the whole profile stays well within the sync size
   * limit even with a full history of long calls.
   */
  transcript?: TranscriptTurn[];
}

export interface LearnerProfile {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  mistakes: string[];
  updatedAt: string;
  /** weakness text -> spacing schedule. */
  reviews?: Record<string, WeaknessReview>;
  /** How many real sessions this learner has had (drives evaluations). */
  sessions?: number;
  /** The session number at which the last evaluation happened. */
  lastEvalSession?: number;
  /** Recent sessions, most recent first — capped so storage stays bounded. */
  history?: SessionEntry[];
  /** One-line diary note for the session just reflected on (from the API). */
  sessionNote?: string;
}

const DAY = 24 * 60 * 60 * 1000;
// Spacing curve (days) for recycling a weak spot: due now, +1, +3, +7, +16, +35.
const INTERVALS = [0, 1, 3, 7, 16, 35];
// Sessions between short evaluation conversations.
const EVAL_EVERY = 5;
// Keep the history log bounded — plenty for "what we've covered lately".
const MAX_HISTORY = 20;
// Per-session transcript bounds — generous for a real call (the tutor's own
// turns are already kept to 1-3 short sentences), bounded so a full 20-session
// history stays a small fraction of the state sync size limit even at worst case.
const MAX_TRANSCRIPT_TURNS = 40;
const MAX_TURN_CHARS = 300;

/** Cap a transcript's length and each turn's size before storing it. */
export function trimTranscript(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): TranscriptTurn[] {
  return messages.slice(-MAX_TRANSCRIPT_TURNS).map((m) => ({
    role: m.role,
    content: m.content.length > MAX_TURN_CHARS ? m.content.slice(0, MAX_TURN_CHARS) + '…' : m.content,
  }));
}

export function loadProfile(): LearnerProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(activeKey());
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || typeof p !== 'object') return null;
    return {
      summary: typeof p.summary === 'string' ? p.summary : '',
      strengths: Array.isArray(p.strengths) ? p.strengths : [],
      weaknesses: Array.isArray(p.weaknesses) ? p.weaknesses : [],
      mistakes: Array.isArray(p.mistakes) ? p.mistakes : [],
      updatedAt: typeof p.updatedAt === 'string' ? p.updatedAt : '',
      reviews: p.reviews && typeof p.reviews === 'object' ? p.reviews : {},
      sessions: typeof p.sessions === 'number' ? p.sessions : 0,
      lastEvalSession: typeof p.lastEvalSession === 'number' ? p.lastEvalSession : 0,
      history: Array.isArray(p.history) ? p.history : [],
    };
  } catch {
    return null;
  }
}

export function saveProfile(profile: LearnerProfile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(activeKey(), JSON.stringify(profile));
    scheduleSync();
  } catch {
    /* storage full/unavailable — memory just won't persist */
  }
}

/**
 * Reconcile the spacing schedule after a session. Weak spots that were due (and
 * are still weak) get pushed further out; brand-new weak spots start due now;
 * weak spots that dropped off the list are considered resolved and forgotten.
 */
export function reconcileReviews(
  weaknesses: string[],
  prev: Record<string, WeaknessReview>,
  now: number
): Record<string, WeaknessReview> {
  const reviews: Record<string, WeaknessReview> = {};
  for (const w of weaknesses) {
    const existing = prev[w];
    if (!existing) {
      reviews[w] = { due: new Date(now).toISOString(), streak: 0 };
      continue;
    }
    const wasDue = new Date(existing.due).getTime() <= now;
    if (wasDue) {
      const streak = Math.min(existing.streak + 1, INTERVALS.length - 1);
      reviews[w] = { due: new Date(now + INTERVALS[streak] * DAY).toISOString(), streak };
    } else {
      reviews[w] = existing; // not due yet — leave its schedule alone
    }
  }
  return reviews;
}

/** Weak spots ordered most-overdue first, so the tutor recycles them in turn. */
export function dueWeaknessesFirst(profile: LearnerProfile | null): string[] {
  if (!profile?.weaknesses?.length) return [];
  const reviews = profile.reviews ?? {};
  const dueTime = (w: string) => {
    const r = reviews[w];
    return r ? new Date(r.due).getTime() : 0; // no schedule yet = maximally due
  };
  return [...profile.weaknesses].sort((a, b) => dueTime(a) - dueTime(b));
}

/** Is it time for a short evaluation conversation? */
export function isEvaluationDue(profile: LearnerProfile | null): boolean {
  const sessions = profile?.sessions ?? 0;
  const last = profile?.lastEvalSession ?? 0;
  return sessions >= 3 && sessions - last >= EVAL_EVERY;
}

/** Mark that an evaluation just happened, so it won't fire again immediately. */
export function markEvaluationDone(): void {
  const p = loadProfile();
  if (!p) return;
  p.lastEvalSession = p.sessions ?? 0;
  saveProfile(p);
}

/**
 * Send a finished conversation to the backend, which distils an updated
 * profile and returns it. We fold in the spacing schedule and session count,
 * persist, and return the result. Fails soft: if the tutor isn't configured or
 * the network hiccups, we keep the old profile.
 */
export async function reflectAndSave(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  wasEvaluation = false
): Promise<LearnerProfile | null> {
  const prev = loadProfile();

  // Skip only a true hello-and-goodbye (no user turn at all) — even a single
  // thing the learner said is worth remembering. A stricter cutoff here
  // previously meant a short call with one real exchange (say something,
  // then hang up) silently never got reflected on at all.
  if (messages.filter((m) => m.role === 'user').length < 1) return prev;

  try {
    const res = await api.post('/tutor/reflect', {
      messages,
      profile: prev,
      language: getLanguage(getActiveLanguageId()).name,
    });
    const fresh: LearnerProfile | undefined = res.data?.profile;
    if (fresh) {
      const now = Date.now();
      fresh.reviews = reconcileReviews(fresh.weaknesses, prev?.reviews ?? {}, now);
      fresh.sessions = (prev?.sessions ?? 0) + 1;
      fresh.lastEvalSession = prev?.lastEvalSession ?? 0;

      const entry: SessionEntry = {
        date: new Date(now).toISOString(),
        note: fresh.sessionNote || 'Had a conversation with Profe.',
        mistakes: fresh.mistakes,
        wasEvaluation: wasEvaluation || undefined,
        transcript: trimTranscript(messages),
      };
      fresh.history = [entry, ...(prev?.history ?? [])].slice(0, MAX_HISTORY);

      saveProfile(fresh);
      return fresh;
    }
  } catch {
    /* keep the existing profile */
  }
  return prev;
}
