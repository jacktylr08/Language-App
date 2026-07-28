import { RealtimeSession } from '../realtime';

/**
 * Coverage for turn-taking on a live call — barge-in (interrupting Profe
 * mid-sentence) and, just as importantly, NOT barge-in.
 *
 * handleEvent/send are private, but they're pure event-driven state logic
 * with no WebRTC objects involved until start() is called, so they're
 * testable directly without mocking RTCPeerConnection.
 */
function makeSession() {
  const cb = {
    onStateChange: jest.fn(),
    onUserTranscript: jest.fn(),
    onAssistantDelta: jest.fn(),
    onAssistantDone: jest.fn(),
    onError: jest.fn(),
  };
  const session = new RealtimeSession(cb);
  const sendSpy = jest.spyOn(session as any, 'send').mockImplementation(() => {});
  const fire = (evt: Record<string, unknown>) => (session as any).handleEvent(JSON.stringify(evt));
  return { session, cb, sendSpy, fire };
}

/** Puts Profe mid-sentence, which is the state every interruption starts from. */
function profeIsTalking(fire: (e: Record<string, unknown>) => void, itemId = 'item_abc') {
  fire({ type: 'response.output_item.added', item: { id: itemId } });
  fire({ type: 'response.audio_transcript.delta', delta: 'Hola, ¿qué tal' });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
});
afterEach(() => jest.useRealTimers());

describe('background noise does not interrupt Profe', () => {
  /**
   * The bug this whole group exists for: voice detection is energy-based, so
   * a TV, a passing car or someone else in the room registered as the learner
   * speaking. Profe stopped, restarted, and stopped again — an endless loop
   * in any room that wasn't silent, which made the tutor unusable.
   */
  it('ignores a blip that stops before the confirmation window', () => {
    const { fire, sendSpy, cb } = makeSession();
    profeIsTalking(fire);
    cb.onStateChange.mockClear();

    fire({ type: 'input_audio_buffer.speech_started' });
    jest.advanceTimersByTime(200); // a door, a cough — over quickly
    fire({ type: 'input_audio_buffer.speech_stopped' });
    jest.advanceTimersByTime(2000);

    // Profe was never cancelled and never even changed state.
    expect(sendSpy).not.toHaveBeenCalled();
    expect(cb.onStateChange).not.toHaveBeenCalled();
  });

  it('survives a whole burst of noise without ever cancelling', () => {
    // A television in the background: repeated short bursts. Each one used to
    // cancel the response and force a restart.
    const { fire, sendSpy } = makeSession();
    profeIsTalking(fire);

    for (let i = 0; i < 12; i++) {
      fire({ type: 'input_audio_buffer.speech_started' });
      jest.advanceTimersByTime(150);
      fire({ type: 'input_audio_buffer.speech_stopped' });
      jest.advanceTimersByTime(150);
    }

    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('does not stack timers when noise retriggers before the window closes', () => {
    const { fire, sendSpy } = makeSession();
    profeIsTalking(fire);

    // Several speech_started events with no intervening stop — one pending
    // barge-in, not five.
    fire({ type: 'input_audio_buffer.speech_started' });
    fire({ type: 'input_audio_buffer.speech_started' });
    fire({ type: 'input_audio_buffer.speech_started' });
    jest.advanceTimersByTime(500);

    const cancels = sendSpy.mock.calls.filter(
      (c) => (c[0] as { type?: string }).type === 'response.cancel'
    );
    expect(cancels).toHaveLength(1);
  });
});

describe('a genuine interruption still works', () => {
  it('cancels and truncates once the learner keeps talking past the window', () => {
    const { fire, sendSpy, cb } = makeSession();
    profeIsTalking(fire);

    jest.setSystemTime(new Date('2026-01-01T00:00:02.500Z')); // 2.5s of playback
    fire({ type: 'input_audio_buffer.speech_started' });
    jest.advanceTimersByTime(400); // sustained — this is a real person

    expect(sendSpy).toHaveBeenCalledWith({ type: 'response.cancel' });
    expect(sendSpy).toHaveBeenCalledWith({
      type: 'conversation.item.truncate',
      item_id: 'item_abc',
      content_index: 0,
      // Measured to when the learner STARTED, not to when we confirmed it —
      // the confirmation delay isn't audio they heard.
      audio_end_ms: 2500,
    });
    expect(cb.onStateChange).toHaveBeenCalledWith('user_speaking');
  });

  it('never bleeds an interrupted sentence into the next response transcript', () => {
    const { fire, cb } = makeSession();

    fire({ type: 'response.output_item.added', item: { id: 'item_1' } });
    fire({ type: 'response.audio_transcript.delta', delta: 'Vamos a hablar sobre' });
    fire({ type: 'input_audio_buffer.speech_started' });
    jest.advanceTimersByTime(400);

    fire({ type: 'response.output_item.added', item: { id: 'item_2' } });
    fire({ type: 'response.audio_transcript.delta', delta: 'Vale, ' });

    // The new turn's caption must start fresh, never
    // "Vamos a hablar sobreVale, " — the bug this test guards against.
    expect(cb.onAssistantDelta).toHaveBeenLastCalledWith('Vale, ');
  });

  it('takes the learner’s turn immediately when Profe is not talking', () => {
    // Nothing to protect, so no reason to wait — the learner should feel
    // heard the instant they open their mouth.
    const { fire, sendSpy, cb } = makeSession();
    fire({ type: 'input_audio_buffer.speech_started' });

    expect(cb.onStateChange).toHaveBeenCalledWith('user_speaking');
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('clears response bookkeeping when a response finishes normally', () => {
    const { fire, sendSpy } = makeSession();

    fire({ type: 'response.output_item.added', item: { id: 'item_xyz' } });
    fire({ type: 'response.audio_transcript.delta', delta: 'Buenos días' });
    fire({ type: 'response.audio_transcript.done', transcript: 'Buenos días' });
    fire({ type: 'response.done' });

    // A later speech_started (the learner's normal turn) must not think
    // there's still something to cancel from the already-finished response.
    fire({ type: 'input_audio_buffer.speech_started' });
    jest.advanceTimersByTime(500);
    expect(sendSpy).not.toHaveBeenCalled();
  });
});

describe('push-to-talk', () => {
  it('disables automatic turn detection and mutes between utterances', () => {
    const { session, sendSpy } = makeSession();
    const muted = jest.spyOn(session, 'setMuted');

    session.setPushToTalk(true);

    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'session.update',
        session: { audio: { input: { turn_detection: null } } },
      })
    );
    // Muted while not holding, so ambient sound never reaches the model.
    expect(muted).toHaveBeenLastCalledWith(true);
    expect(session.isPushToTalk()).toBe(true);
  });

  it('commits the utterance and asks for a reply on release', () => {
    const { session, sendSpy } = makeSession();
    session.setPushToTalk(true);
    sendSpy.mockClear();

    session.beginUtterance();
    session.endUtterance();

    expect(sendSpy).toHaveBeenCalledWith({ type: 'input_audio_buffer.clear' });
    expect(sendSpy).toHaveBeenCalledWith({ type: 'input_audio_buffer.commit' });
    expect(sendSpy).toHaveBeenCalledWith({ type: 'response.create' });
  });

  it('restores hands-free turn detection when switched back off', () => {
    const { session, sendSpy } = makeSession();
    session.setPushToTalk(true);
    sendSpy.mockClear();
    session.setPushToTalk(false);

    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        session: { audio: { input: { turn_detection: { type: 'semantic_vad', eagerness: 'low' } } } },
      })
    );
    expect(session.isPushToTalk()).toBe(false);
  });

  it('does nothing on begin/end when push-to-talk is off', () => {
    const { session, sendSpy } = makeSession();
    session.beginUtterance();
    session.endUtterance();
    expect(sendSpy).not.toHaveBeenCalled();
  });
});
