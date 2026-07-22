/**
 * The learner's chosen voice for Profe's live voice calls. Purely a device
 * preference (like a phone's TTS voice setting) — not part of tutor memory,
 * so it isn't synced across devices or fed into tutor-context.
 */
import { TUTOR_VOICE_KEY } from './keys';

export interface TutorVoiceOption {
  id: string;
  label: string;
  vibe: string;
}

// Every voice the Realtime API supports — see backend's REALTIME_VOICES,
// which is the actual source of truth the server validates against; this
// list is just the same names with a friendly one-line vibe for the picker.
export const TUTOR_VOICES: TutorVoiceOption[] = [
  { id: 'cedar', label: 'Cedar', vibe: 'Warm and natural (default)' },
  { id: 'marin', label: 'Marin', vibe: 'Bright and clear' },
  { id: 'alloy', label: 'Alloy', vibe: 'Calm and neutral' },
  { id: 'ash', label: 'Ash', vibe: 'Measured and steady' },
  { id: 'ballad', label: 'Ballad', vibe: 'Smooth and gentle' },
  { id: 'coral', label: 'Coral', vibe: 'Friendly and upbeat' },
  { id: 'sage', label: 'Sage', vibe: 'Mellow and reassuring' },
  { id: 'verse', label: 'Verse', vibe: 'Expressive and lively' },
];

const DEFAULT_VOICE = 'cedar';

export function loadTutorVoice(): string {
  if (typeof window === 'undefined') return DEFAULT_VOICE;
  try {
    const stored = localStorage.getItem(TUTOR_VOICE_KEY);
    return stored && TUTOR_VOICES.some((v) => v.id === stored) ? stored : DEFAULT_VOICE;
  } catch {
    return DEFAULT_VOICE;
  }
}

export function saveTutorVoice(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TUTOR_VOICE_KEY, id);
  } catch {
    /* ignore */
  }
}
