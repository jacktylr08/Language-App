/**
 * The tutor's memory of one learner — what they're good at, what they keep
 * getting wrong, and a running summary. Persisted in localStorage (and synced
 * to the account via lib/sync so it follows you across devices), and distilled
 * from each conversation by the backend /tutor/reflect endpoint.
 */
import { api } from './api';
import { TUTOR_PROFILE_KEY } from './keys';
import { scheduleSync } from './sync';

export interface LearnerProfile {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  mistakes: string[];
  updatedAt: string;
}

export function loadProfile(): LearnerProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(TUTOR_PROFILE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || typeof p !== 'object') return null;
    return {
      summary: typeof p.summary === 'string' ? p.summary : '',
      strengths: Array.isArray(p.strengths) ? p.strengths : [],
      weaknesses: Array.isArray(p.weaknesses) ? p.weaknesses : [],
      mistakes: Array.isArray(p.mistakes) ? p.mistakes : [],
      updatedAt: typeof p.updatedAt === 'string' ? p.updatedAt : '',
    };
  } catch {
    return null;
  }
}

export function saveProfile(profile: LearnerProfile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TUTOR_PROFILE_KEY, JSON.stringify(profile));
    scheduleSync();
  } catch {
    /* storage full/unavailable — memory just won't persist */
  }
}

/**
 * Send a finished conversation to the backend, which distils an updated
 * profile and returns it. We persist and return the result. Fails soft: if the
 * tutor isn't configured or the network hiccups, we keep the old profile.
 */
export async function reflectAndSave(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<LearnerProfile | null> {
  // Not worth a round-trip for a hello-and-goodbye.
  if (messages.filter((m) => m.role === 'user').length < 2) return loadProfile();

  try {
    const res = await api.post('/tutor/reflect', {
      messages,
      profile: loadProfile(),
    });
    const profile: LearnerProfile | undefined = res.data?.profile;
    if (profile) {
      saveProfile(profile);
      return profile;
    }
  } catch {
    /* keep the existing profile */
  }
  return loadProfile();
}
