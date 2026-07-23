/**
 * Speech helpers: native browser TTS (speaking Spanish to the learner)
 * and speech recognition (listening to the learner speak Spanish).
 * Both are free, on-device browser APIs — no keys, no cost.
 */
import { getActiveLanguage } from './languages';

const VOICE_PREF_KEY = 'tutor-voice-uri';

function readVoicePref(): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(VOICE_PREF_KEY);
  } catch {
    return null;
  }
}

let chosenVoiceURI: string | null = readVoicePref();

function allCourseLanguageVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  // Match on the locale's base language subtag (e.g. "es" from "es-ES") —
  // browsers expose voices tagged with all sorts of region variants.
  const base = getActiveLanguage().locale.split('-')[0].toLowerCase();
  return window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith(base));
}

/**
 * Score a voice by likely quality. Browsers ship a mix of ancient robotic
 * voices and modern neural ones ("Natural"/"Neural"/"Enhanced", or Google's
 * online voices). We rank the good ones to the top so the default doesn't
 * grab a tinny one.
 */
function scoreVoice(v: SpeechSynthesisVoice): number {
  const n = v.name.toLowerCase();
  const lang = v.lang.toLowerCase();
  let s = 0;
  if (/natural|neural|enhanced|premium/.test(n)) s += 100;
  if (!v.localService) s += 40; // cloud/online voices are usually far better
  if (/google/.test(n)) s += 35;
  if (/online/.test(n)) s += 20;
  if (/mónica|monica|paulina|helena|sabina|lupe|conchita/.test(n)) s += 10;
  if (lang === 'es-es') s += 8;
  else if (lang === 'es-mx' || lang === 'es-us') s += 6;
  else s += 2;
  return s;
}

/** All Spanish voices on this device, best first. */
export function listSpanishVoices(): SpeechSynthesisVoice[] {
  return allCourseLanguageVoices().sort((a, b) => scoreVoice(b) - scoreVoice(a));
}

function pickSpanishVoice(): SpeechSynthesisVoice | null {
  const voices = listSpanishVoices();
  if (chosenVoiceURI) {
    const chosen = voices.find((v) => v.voiceURI === chosenVoiceURI);
    if (chosen) return chosen;
  }
  return voices[0] || null;
}

/** Remember the user's chosen voice across sessions. */
export function setPreferredVoice(voiceURI: string): void {
  chosenVoiceURI = voiceURI;
  try {
    localStorage.setItem(VOICE_PREF_KEY, voiceURI);
  } catch {
    /* private mode / storage disabled — keep it in memory only */
  }
}

export function getPreferredVoiceURI(): string | null {
  return chosenVoiceURI ?? pickSpanishVoice()?.voiceURI ?? null;
}

// Warm the voice list (Chrome/Edge load it asynchronously).
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    // list is now populated; nothing to cache, pickSpanishVoice reads live
  };
}

export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Speak Spanish text aloud. Returns a promise that resolves when done. */
export function speak(text: string, rate = 0.95): Promise<void> {
  return new Promise((resolve) => {
    if (!ttsSupported()) return resolve();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voice = pickSpanishVoice();
    // Match the utterance language to the chosen voice — a mismatch makes some
    // engines silently fall back to a default (usually worse) voice.
    u.lang = voice?.lang || getActiveLanguage().locale;
    u.rate = rate;
    u.pitch = 1.0;
    if (voice) u.voice = voice;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

export function stopSpeaking(): void {
  if (ttsSupported()) window.speechSynthesis.cancel();
}

// ---------- Speech recognition (learner speaks, we check) ----------

type SR = any;

function getRecognitionCtor(): SR | null {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export function speechRecognitionSupported(): boolean {
  return getRecognitionCtor() !== null;
}

export interface RecognitionResult {
  transcript: string;
  error?: string;
}

/** Listen once for Spanish speech and return the transcript. */
export function listenOnce(timeoutMs = 8000): Promise<RecognitionResult> {
  return new Promise((resolve) => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return resolve({ transcript: '', error: 'unsupported' });

    const rec = new Ctor();
    rec.lang = getActiveLanguage().locale;
    rec.interimResults = false;
    rec.maxAlternatives = 3;

    let settled = false;
    const finish = (result: RecognitionResult) => {
      if (settled) return;
      settled = true;
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
      resolve(result);
    };

    const timer = setTimeout(() => finish({ transcript: '', error: 'timeout' }), timeoutMs);

    rec.onresult = (event: any) => {
      clearTimeout(timer);
      const alternatives: string[] = [];
      const res = event.results[0];
      for (let i = 0; i < res.length; i++) alternatives.push(res[i].transcript);
      finish({ transcript: alternatives.join(' | ') });
    };
    rec.onerror = (event: any) => {
      clearTimeout(timer);
      finish({ transcript: '', error: event.error || 'error' });
    };
    rec.onend = () => {
      clearTimeout(timer);
      finish({ transcript: '', error: 'no-speech' });
    };

    try {
      rec.start();
    } catch {
      clearTimeout(timer);
      finish({ transcript: '', error: 'error' });
    }
  });
}

// ---------- Live, hands-free listening ----------

export interface LiveMicHandlers {
  /** Live partial transcript as the learner speaks (for on-screen feedback). */
  onInterim?: (text: string) => void;
  /** Fired once the learner pauses — a complete utterance to send to the tutor. */
  onFinal: (text: string) => void;
  onError?: (error: string) => void;
}

/**
 * Continuous speech recognition with silence-based endpointing, built for a
 * flowing hands-free conversation. It keeps listening, streams interim text,
 * and when the learner pauses for a beat it emits the finished utterance — no
 * button presses. pause()/resume() let the caller stop listening while the
 * tutor is speaking, so the mic never hears the tutor's own voice.
 */
export class LiveMic {
  private rec: any = null;
  private active = false;
  private paused = false;
  private finalBuffer = '';
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private handlers: LiveMicHandlers,
    private silenceMs = 1300
  ) {}

  static supported(): boolean {
    return speechRecognitionSupported();
  }

  start(): void {
    this.active = true;
    this.paused = false;
    this.finalBuffer = '';
    this.launch();
  }

  stop(): void {
    this.active = false;
    this.clearSilence();
    this.teardown();
  }

  /** Stop listening (e.g. while the tutor speaks) without ending the session. */
  pause(): void {
    this.paused = true;
    this.clearSilence();
    this.finalBuffer = '';
    this.teardown();
  }

  resume(): void {
    if (!this.active) return;
    this.paused = false;
    this.finalBuffer = '';
    this.launch();
  }

  private teardown(): void {
    if (this.rec) {
      try {
        this.rec.onend = null;
        this.rec.onresult = null;
        this.rec.onerror = null;
        this.rec.stop();
      } catch {
        /* already stopped */
      }
      this.rec = null;
    }
  }

  private launch(): void {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      this.handlers.onError?.('unsupported');
      return;
    }
    const rec = new Ctor();
    rec.lang = getActiveLanguage().locale;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (event: any) => {
      if (this.paused) return;
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) this.finalBuffer += r[0].transcript + ' ';
        else interim += r[0].transcript;
      }
      this.handlers.onInterim?.((this.finalBuffer + interim).trim());
      this.armSilence();
    };

    rec.onerror = (event: any) => {
      const err = event?.error || 'error';
      // 'no-speech' and 'aborted' are normal during quiet stretches / restarts.
      if (err !== 'no-speech' && err !== 'aborted') this.handlers.onError?.(err);
    };

    rec.onend = () => {
      // Chrome ends recognition every so often; restart to stay continuous.
      if (this.active && !this.paused) {
        try {
          rec.start();
        } catch {
          /* will settle on the next tick */
        }
      }
    };

    this.rec = rec;
    try {
      rec.start();
    } catch {
      /* start can throw if called too quickly after stop — onend will retry */
    }
  }

  private armSilence(): void {
    this.clearSilence();
    this.silenceTimer = setTimeout(() => this.flush(), this.silenceMs);
  }

  private clearSilence(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  private flush(): void {
    const text = this.finalBuffer.trim();
    this.finalBuffer = '';
    if (text) this.handlers.onFinal(text);
  }
}

// ---------- Answer comparison ----------

/** Lowercase, trim, strip punctuation and collapse spaces. Keeps accents. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[¿?¡!.,;:'"«»()\-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Also strip accents/ñ→n for lenient comparison. */
export function normalizeLoose(text: string): string {
  return normalize(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export type MatchQuality = 'exact' | 'accents' | 'close' | 'wrong';

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[n];
}

/**
 * Compare a learner's answer against accepted answers.
 * 'exact'   — perfect (ignoring case/punctuation)
 * 'accents' — right word, missed accents (counts as correct with a nudge)
 * 'close'   — one small typo (counts as correct with a nudge)
 * 'wrong'   — no match
 */
export function matchAnswer(input: string, accepted: string[]): MatchQuality {
  const inNorm = normalize(input);
  const inLoose = normalizeLoose(input);
  if (!inNorm) return 'wrong';

  for (const a of accepted) {
    if (normalize(a) === inNorm) return 'exact';
  }
  for (const a of accepted) {
    if (normalizeLoose(a) === inLoose) return 'accents';
  }
  for (const a of accepted) {
    const target = normalizeLoose(a);
    if (target.length >= 4 && levenshtein(inLoose, target) === 1) return 'close';
  }
  return 'wrong';
}

/** Check a spoken transcript (may contain multiple alternatives split by " | "). */
export function matchSpoken(transcript: string, target: string): boolean {
  const alternatives = transcript.split('|').map((t) => t.trim());
  const targetLoose = normalizeLoose(target);
  return alternatives.some((alt) => {
    const altLoose = normalizeLoose(alt);
    if (!altLoose) return false;
    if (altLoose === targetLoose) return true;
    if (altLoose.includes(targetLoose) || targetLoose.includes(altLoose)) return true;
    return targetLoose.length >= 5 && levenshtein(altLoose, targetLoose) <= 2;
  });
}
