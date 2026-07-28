/**
 * The feedback layer runs on every single answer, so its failure modes
 * matter more than its success ones: an unsupported browser, a blocked
 * AudioContext or a missing Vibration API must never interrupt a lesson.
 */
import { SOUND_KEY, HAPTICS_KEY } from '../keys';

/**
 * feedback.ts caches its AudioContext on purpose — creating one per sound
 * leaks contexts, and browsers cap how many a page may open. That means each
 * test needs a fresh module registry, or the context built by the first test
 * is the one every later test sees.
 */
async function freshFeedback() {
  let mod!: typeof import('../feedback');
  await jest.isolateModulesAsync(async () => {
    mod = await import('../feedback');
  });
  return mod;
}

/** Minimal AudioContext stand-in — jsdom has none. */
function mockAudio() {
  const started: number[] = [];
  const osc = () => ({
    type: '',
    frequency: { value: 0 },
    connect: jest.fn().mockReturnThis(),
    start: jest.fn((t: number) => started.push(t)),
    stop: jest.fn(),
  });
  const gain = () => ({
    gain: { setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() },
    connect: jest.fn().mockReturnThis(),
  });
  const ctx = {
    currentTime: 0,
    state: 'running',
    destination: {},
    resume: jest.fn(),
    createOscillator: jest.fn(osc),
    createGain: jest.fn(gain),
  };
  (window as unknown as { AudioContext: unknown }).AudioContext = jest.fn(() => ctx);
  return { ctx, started };
}

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

describe('preferences', () => {
  it('defaults both to on, so a learner who never opens settings gets the designed experience', async () => {
    const fb = await freshFeedback();
    expect(fb.soundEnabled()).toBe(true);
    expect(fb.hapticsEnabled()).toBe(true);
  });

  it('remembers being switched off', async () => {
    const fb = await freshFeedback();
    fb.setSoundEnabled(false);
    fb.setHapticsEnabled(false);
    expect(fb.soundEnabled()).toBe(false);
    expect(fb.hapticsEnabled()).toBe(false);
    expect(localStorage.getItem(SOUND_KEY)).toBe('off');
    expect(localStorage.getItem(HAPTICS_KEY)).toBe('off');
  });
});

describe('playing feedback', () => {
  it('plays a tone per event when sound is on', async () => {
    const { ctx } = mockAudio();
    (await freshFeedback()).feedback('correct');
    // "correct" is a two-note rise, so two oscillators.
    expect(ctx.createOscillator).toHaveBeenCalledTimes(2);
  });

  it('plays nothing at all when sound is off', async () => {
    const { ctx } = mockAudio();
    const fb = await freshFeedback();
    fb.setSoundEnabled(false);
    fb.feedback('correct');
    expect(ctx.createOscillator).not.toHaveBeenCalled();
  });

  it('resumes a context Safari suspended in the background', async () => {
    const { ctx } = mockAudio();
    ctx.state = 'suspended';
    (await freshFeedback()).feedback('tap');
    expect(ctx.resume).toHaveBeenCalled();
  });
});

describe('haptics', () => {
  it('vibrates when supported and enabled', async () => {
    mockAudio();
    const vibrate = jest.fn();
    (navigator as unknown as { vibrate: unknown }).vibrate = vibrate;
    (await freshFeedback()).feedback('wrong');
    expect(vibrate).toHaveBeenCalled();
  });

  it('does not vibrate when switched off', async () => {
    mockAudio();
    const vibrate = jest.fn();
    (navigator as unknown as { vibrate: unknown }).vibrate = vibrate;
    const fb = await freshFeedback();
    fb.setHapticsEnabled(false);
    fb.feedback('wrong');
    expect(vibrate).not.toHaveBeenCalled();
  });
});

describe('never breaking a lesson', () => {
  it('survives a browser with no AudioContext (older Safari, locked-down webviews)', async () => {
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
    delete (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext;
    const fb = await freshFeedback();
    expect(() => fb.feedback('correct')).not.toThrow();
    expect(() => fb.primeAudio()).not.toThrow();
  });

  it('survives an AudioContext that throws when constructed (autoplay policy)', async () => {
    (window as unknown as { AudioContext: unknown }).AudioContext = jest.fn(() => {
      throw new Error('not allowed');
    });
    const fb = await freshFeedback();
    expect(() => fb.feedback('complete')).not.toThrow();
  });

  it('survives a browser with no Vibration API (every iOS Safari)', async () => {
    mockAudio();
    delete (navigator as unknown as { vibrate?: unknown }).vibrate;
    const fb = await freshFeedback();
    expect(() => fb.feedback('correct')).not.toThrow();
  });

  it('survives vibrate() throwing', async () => {
    mockAudio();
    (navigator as unknown as { vibrate: unknown }).vibrate = () => {
      throw new Error('blocked');
    };
    const fb = await freshFeedback();
    expect(() => fb.feedback('streak')).not.toThrow();
  });
});
