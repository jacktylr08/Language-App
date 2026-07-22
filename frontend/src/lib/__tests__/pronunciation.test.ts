import {
  pronunciationRecordingSupported,
  startRecording,
  assessPronunciationFromBlob,
} from '../pronunciation';

describe('pronunciation graceful degradation', () => {
  it('reports unsupported in an environment with no MediaRecorder/AudioContext (like this test env)', () => {
    // jsdom doesn't implement MediaRecorder or AudioContext — this should
    // detect that cleanly, the same way push.ts detects no PushManager.
    expect(pronunciationRecordingSupported()).toBe(false);
  });

  it('startRecording resolves null rather than throwing when unsupported', async () => {
    await expect(startRecording()).resolves.toBeNull();
  });

  it('assessPronunciationFromBlob resolves null rather than throwing on a decode failure', async () => {
    // No real AudioContext in this environment, so decoding will fail —
    // callers must get null back, never an unhandled rejection.
    const fakeBlob = new Blob(['not real audio'], { type: 'audio/webm' });
    await expect(assessPronunciationFromBlob(fakeBlob, 'hola')).resolves.toBeNull();
  });
});
