/**
 * Tutor voice playback.
 *
 * Primary path: neural, human-sounding speech from the backend /tutor/speak
 * endpoint (OpenAI voices). Fallback: the free on-device browser voice, used
 * automatically if the server voice isn't configured or a request fails — so
 * the tutor always speaks, it just sounds better once the key is set.
 */
import { api } from './api';
import { speak as browserSpeak, stopSpeaking as browserStop, ttsSupported } from './speech';

let currentAudio: HTMLAudioElement | null = null;
// Once we learn the server voice isn't configured (503), stop asking and go
// straight to the browser voice for the rest of the session.
let neuralAvailable: boolean | null = null;

export function stopSpeaking(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
  browserStop();
}

export interface SpeakOptions {
  /** Called once when playback finishes naturally (not when interrupted). */
  onEnd?: () => void;
}

/**
 * Speak text with the neural voice, falling back to the browser voice.
 * `onEnd` fires once when speech finishes on its own — the live conversation
 * loop uses it to know when to reopen the mic.
 */
export async function speakText(text: string, opts: SpeakOptions = {}): Promise<void> {
  const clean = text.trim();
  if (!clean) {
    opts.onEnd?.();
    return;
  }

  stopSpeaking();

  let ended = false;
  const finish = () => {
    if (ended) return;
    ended = true;
    opts.onEnd?.();
  };

  if (neuralAvailable === false) {
    if (ttsSupported()) browserSpeak(clean).then(finish);
    else finish();
    return;
  }

  try {
    const res = await api.post(
      '/tutor/speak',
      { text: clean },
      { responseType: 'arraybuffer' }
    );
    neuralAvailable = true;

    const blob = new Blob([res.data], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;
    const cleanup = () => {
      URL.revokeObjectURL(url);
      if (currentAudio === audio) currentAudio = null;
    };
    audio.onended = () => {
      cleanup();
      finish();
    };
    audio.onerror = () => {
      cleanup();
      finish();
    };
    await audio.play().catch(() => {
      // Autoplay may be blocked until the first user gesture — harmless.
    });
  } catch (err: any) {
    if (err?.response?.status === 503) {
      neuralAvailable = false;
    }
    // Whatever went wrong, still speak with the browser voice.
    if (ttsSupported()) browserSpeak(clean).then(finish);
    else finish();
  }
}

/** Voice output is always available (neural or browser fallback). */
export function voiceSupported(): boolean {
  return true;
}
