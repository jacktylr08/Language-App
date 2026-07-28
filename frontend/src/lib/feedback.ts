/**
 * Sound and haptics — the layer that makes an interface feel like a thing
 * rather than a page.
 *
 * The app had none. It played tutor audio, but tapping an answer, getting it
 * right, getting it wrong and finishing an eleven-minute lesson were all
 * completely silent and completely still. Silence is the single loudest
 * signal that software is a website, and the correct/incorrect chime is a
 * large part of why the loop in apps like this feels good at all.
 *
 * Sounds are SYNTHESISED with the Web Audio API rather than loaded as files.
 * That's a deliberate trade: no audio assets to download (the whole thing is
 * under 3KB of code), no format/codec fallbacks, nothing to cache offline,
 * and every tone is tunable in source. The cost is that they're simple
 * tones — which suits the app, where they need to be unobtrusive enough to
 * hear forty times in one lesson.
 */

import { SOUND_KEY, HAPTICS_KEY } from './keys';

export type FeedbackEvent =
  | 'tap' // a choice was selected
  | 'correct' // right first time
  | 'almost' // right, but on a retry
  | 'wrong'
  | 'complete' // lesson or session finished
  | 'streak'; // a streak day was banked

// ---------------------------------------------------------------- settings

function readPref(key: string): boolean {
  if (typeof window === 'undefined') return false;
  // Default ON: a learner who has never opened settings should get the
  // designed experience, not the silent one.
  return localStorage.getItem(key) !== 'off';
}

export const soundEnabled = (): boolean => readPref(SOUND_KEY);
export const hapticsEnabled = (): boolean => readPref(HAPTICS_KEY);

export function setSoundEnabled(on: boolean): void {
  localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
}
export function setHapticsEnabled(on: boolean): void {
  localStorage.setItem(HAPTICS_KEY, on ? 'on' : 'off');
}

// ------------------------------------------------------------------ audio

let ctx: AudioContext | null = null;

/**
 * Browsers refuse to start an AudioContext until the user has interacted with
 * the page, so this is created lazily on the first sound (which is always
 * triggered by a tap) rather than at import time.
 */
function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  // Safari suspends the context when the tab is backgrounded and doesn't
  // always resume it on return.
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

interface Tone {
  freq: number;
  /** Seconds from the start of the event. */
  at: number;
  duration: number;
  /** Peak gain — kept low; these play constantly during a lesson. */
  gain?: number;
  type?: OscillatorType;
}

function play(tones: Tone[]): void {
  const ac = audio();
  if (!ac) return;
  const now = ac.currentTime;

  for (const t of tones) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = t.type ?? 'sine';
    osc.frequency.value = t.freq;

    const start = now + t.at;
    const peak = t.gain ?? 0.12;
    // A short attack and an exponential release — a raw start/stop on a gain
    // node clicks audibly, which sounds broken rather than crisp.
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + t.duration);

    osc.connect(gain).connect(ac.destination);
    osc.start(start);
    osc.stop(start + t.duration + 0.02);
  }
}

/**
 * The sound palette.
 *
 * Correct rises, wrong falls — the association is close to universal and
 * needs no learning. "Almost" is deliberately the same shape as correct but
 * duller and lower, so a retry win feels earned rather than identical to a
 * clean one. Complete is a major arpeggio: it should be the only sound in
 * the app that feels like an occasion.
 */
const PALETTE: Record<FeedbackEvent, Tone[]> = {
  tap: [{ freq: 440, at: 0, duration: 0.05, gain: 0.05, type: 'triangle' }],
  correct: [
    { freq: 660, at: 0, duration: 0.1 },
    { freq: 880, at: 0.07, duration: 0.16 },
  ],
  almost: [
    { freq: 520, at: 0, duration: 0.1, gain: 0.09 },
    { freq: 620, at: 0.07, duration: 0.14, gain: 0.09 },
  ],
  wrong: [
    { freq: 200, at: 0, duration: 0.16, gain: 0.1, type: 'triangle' },
    { freq: 150, at: 0.08, duration: 0.2, gain: 0.09, type: 'triangle' },
  ],
  complete: [
    { freq: 523.25, at: 0, duration: 0.18 }, // C5
    { freq: 659.25, at: 0.1, duration: 0.18 }, // E5
    { freq: 783.99, at: 0.2, duration: 0.22 }, // G5
    { freq: 1046.5, at: 0.32, duration: 0.42 }, // C6
  ],
  streak: [
    { freq: 587.33, at: 0, duration: 0.12 },
    { freq: 880, at: 0.09, duration: 0.26 },
  ],
};

// --------------------------------------------------------------- haptics

/**
 * Vibration patterns, in the [buzz, pause, buzz…] form navigator.vibrate
 * takes. Deliberately short — a long buzz on a phone reads as an error or a
 * phone call, not as feedback.
 *
 * iOS Safari does not implement the Vibration API at all, so this is a no-op
 * there today. When the app is wrapped for the App Store, this is the single
 * function that needs to call the native haptics plugin instead.
 */
const HAPTICS: Record<FeedbackEvent, number | number[]> = {
  tap: 8,
  correct: 14,
  almost: [10, 40, 10],
  wrong: [26, 50, 26],
  complete: [16, 60, 16, 60, 40],
  streak: [12, 40, 24],
};

// ------------------------------------------------------------------- api

/**
 * Fire the sound and haptic for an event. Safe to call from anywhere,
 * including during render-triggered effects — it never throws and never
 * blocks.
 */
export function feedback(event: FeedbackEvent): void {
  if (typeof window === 'undefined') return;

  try {
    if (soundEnabled()) play(PALETTE[event]);
  } catch {
    // A blocked or unavailable AudioContext must never break an exercise.
  }

  try {
    if (hapticsEnabled() && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(HAPTICS[event]);
    }
  } catch {
    /* unsupported */
  }
}

/**
 * Warms the AudioContext from a real user gesture. Browsers only allow it to
 * start inside a genuine interaction, so calling this on the first tap of a
 * session means the first *correct* answer isn't silent while the context
 * spins up.
 */
export function primeAudio(): void {
  if (!soundEnabled()) return;
  try {
    audio();
  } catch {
    /* nothing to prime */
  }
}
