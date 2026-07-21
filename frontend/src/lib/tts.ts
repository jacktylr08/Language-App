/**
 * Neural voice playback — used by both the tutor and the lessons.
 *
 * Primary path: neural, human-sounding speech from the backend /tutor/speak
 * endpoint (OpenAI voices). Fallback: the free on-device browser voice, used
 * automatically if the server voice isn't configured or a request fails — so
 * something always speaks, it just sounds far better once the key is set.
 *
 * Audio is cached by text, so replaying a word (or hearing the same vocab
 * across exercises) is instant and costs nothing extra.
 */
import { api } from './api';
import { speak as browserSpeak, stopSpeaking as browserStop, ttsSupported } from './speech';

let currentAudio: HTMLAudioElement | null = null;
// Once we learn the server voice isn't configured (503), stop asking and go
// straight to the browser voice for the rest of the session.
let neuralAvailable: boolean | null = null;

// text -> object URL of fetched MP3. Bounded so a long session can't grow it
// without limit.
const audioCache = new Map<string, string>();
const MAX_CACHE = 200;

function cacheGet(text: string): string | undefined {
  return audioCache.get(text);
}
function cachePut(text: string, url: string): void {
  if (audioCache.size >= MAX_CACHE) {
    const oldest = audioCache.keys().next().value;
    if (oldest !== undefined) {
      const oldUrl = audioCache.get(oldest);
      audioCache.delete(oldest);
      if (oldUrl) URL.revokeObjectURL(oldUrl);
    }
  }
  audioCache.set(text, url);
}

export function stopSpeaking(): void {
  if (currentAudio) {
    currentAudio.pause();
    // Don't clear src to '' — the URL is cached and reused. Just detach.
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio = null;
  }
  browserStop();
}

export interface SpeakOptions {
  /** Playback rate (1 = normal). Lessons use ~0.85–1 for clarity. */
  rate?: number;
  /** Called once when playback finishes on its own (not when interrupted). */
  onEnd?: () => void;
}

/** Fetch (or reuse) the neural MP3 for `text` and return an object URL. */
async function neuralUrl(text: string): Promise<string> {
  const cached = cacheGet(text);
  if (cached) return cached;
  const res = await api.post('/tutor/speak', { text }, { responseType: 'arraybuffer' });
  const blob = new Blob([res.data], { type: 'audio/mpeg' });
  const url = URL.createObjectURL(blob);
  cachePut(text, url);
  return url;
}

/**
 * Speak text with the neural voice, falling back to the browser voice.
 * The returned promise resolves (and `onEnd` fires) when playback finishes on
 * its own — so callers can await it to sequence lines (e.g. a dialogue).
 */
export async function speakText(text: string, opts: SpeakOptions = {}): Promise<void> {
  const clean = text.trim();
  const rate = opts.rate ?? 1;

  return new Promise<void>((resolve) => {
    let ended = false;
    const finish = () => {
      if (ended) return;
      ended = true;
      opts.onEnd?.();
      resolve();
    };

    if (!clean) return finish();

    stopSpeaking();

    // Known unconfigured → browser voice straight away.
    if (neuralAvailable === false) {
      if (ttsSupported()) browserSpeak(clean, rate).then(finish);
      else finish();
      return;
    }

    neuralUrl(clean)
      .then((url) => {
        neuralAvailable = true;
        const audio = new Audio(url);
        audio.playbackRate = rate;
        currentAudio = audio;
        audio.onended = finish;
        audio.onerror = finish;
        audio.play().catch(() => {
          // Autoplay may be blocked until the first user gesture — resolve so
          // callers aren't left hanging.
          finish();
        });
      })
      .catch((err: any) => {
        if (err?.response?.status === 503) neuralAvailable = false;
        if (ttsSupported()) browserSpeak(clean, rate).then(finish);
        else finish();
      });
  });
}

/**
 * Drop-in for the old browser `speak(text, rate)` — same signature, but now the
 * warm neural voice (with automatic browser fallback). Used by the lessons.
 */
export function speakNeural(text: string, rate = 1): Promise<void> {
  return speakText(text, { rate });
}

/** Voice output is always available (neural or browser fallback). */
export function voiceSupported(): boolean {
  return true;
}
