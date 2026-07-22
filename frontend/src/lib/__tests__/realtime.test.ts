import { RealtimeSession } from '../realtime';

/**
 * Regression coverage for barge-in (interrupting Profe mid-sentence) — the
 * gap that made live calls feel like an interview instead of a real
 * conversation. handleEvent/send are private, but they're pure event-driven
 * state logic with no WebRTC objects involved until start() is called, so
 * they're testable directly without mocking RTCPeerConnection.
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

describe('RealtimeSession barge-in handling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });
  afterEach(() => jest.useRealTimers());

  it('cancels and truncates the in-progress response when the learner interrupts mid-sentence', () => {
    const { fire, sendSpy, cb } = makeSession();

    fire({ type: 'response.output_item.added', item: { id: 'item_abc' } });
    fire({ type: 'response.audio_transcript.delta', delta: 'Hola, ¿qué tal' });

    jest.setSystemTime(new Date('2026-01-01T00:00:02.500Z')); // 2.5s of "playback" elapsed
    fire({ type: 'input_audio_buffer.speech_started' });

    expect(sendSpy).toHaveBeenCalledWith({ type: 'response.cancel' });
    expect(sendSpy).toHaveBeenCalledWith({
      type: 'conversation.item.truncate',
      item_id: 'item_abc',
      content_index: 0,
      audio_end_ms: 2500,
    });
    expect(cb.onStateChange).toHaveBeenCalledWith('user_speaking');
  });

  it('never bleeds an interrupted sentence into the next response transcript', () => {
    const { fire, cb } = makeSession();

    fire({ type: 'response.output_item.added', item: { id: 'item_1' } });
    fire({ type: 'response.audio_transcript.delta', delta: 'Vamos a hablar sobre' });
    fire({ type: 'input_audio_buffer.speech_started' }); // interrupt

    fire({ type: 'response.output_item.added', item: { id: 'item_2' } });
    fire({ type: 'response.audio_transcript.delta', delta: 'Vale, ' });

    // The new turn's caption must start fresh, never
    // "Vamos a hablar sobreVale, " — the bug this test guards against.
    expect(cb.onAssistantDelta).toHaveBeenLastCalledWith('Vale, ');
  });

  it('does not send cancel/truncate for speech_started while already just listening (nothing to interrupt)', () => {
    const { fire, sendSpy } = makeSession();
    fire({ type: 'input_audio_buffer.speech_started' });
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('clears response bookkeeping when a response finishes normally, uninterrupted', () => {
    const { fire, sendSpy } = makeSession();

    fire({ type: 'response.output_item.added', item: { id: 'item_xyz' } });
    fire({ type: 'response.audio_transcript.delta', delta: 'Buenos días' });
    fire({ type: 'response.audio_transcript.done', transcript: 'Buenos días' });
    fire({ type: 'response.done' });

    // A later speech_started (the learner's normal turn) must not think
    // there's still something to cancel from the already-finished response.
    fire({ type: 'input_audio_buffer.speech_started' });
    expect(sendSpy).not.toHaveBeenCalled();
  });
});
