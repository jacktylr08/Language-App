/**
 * Speech helpers: native browser TTS (speaking Spanish to the learner)
 * and speech recognition (listening to the learner speak Spanish).
 * Both are free, on-device browser APIs — no keys, no cost.
 */

let cachedVoice: SpeechSynthesisVoice | null = null;

function pickSpanishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  cachedVoice =
    voices.find((v) => v.lang === 'es-ES' && /female|Mónica|Monica|Paulina|Helena/i.test(v.name)) ||
    voices.find((v) => v.lang === 'es-ES') ||
    voices.find((v) => v.lang.startsWith('es')) ||
    null;
  return cachedVoice;
}

// Warm the voice list (Chrome loads it async)
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = null;
    pickSpanishVoice();
  };
}

export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Speak Spanish text aloud. Returns a promise that resolves when done. */
export function speak(text: string, rate = 0.9): Promise<void> {
  return new Promise((resolve) => {
    if (!ttsSupported()) return resolve();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-ES';
    u.rate = rate;
    const voice = pickSpanishVoice();
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
    rec.lang = 'es-ES';
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
