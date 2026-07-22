/**
 * Phoneme-level pronunciation scoring (Azure Speech Pronunciation Assessment)
 * — a real, best-effort ENHANCEMENT layered on top of the existing "speak"
 * exercise, never a replacement for it. The exercise is still graded by the
 * existing Web Speech transcript match (lib/speech.ts's matchSpoken), which
 * needs no server config and always works; this adds an extra accuracy
 * readout when — and only when — the backend has Azure Speech configured.
 * Every function here fails soft (returns null) on anything going wrong —
 * unsupported browser, no mic, network error, or a 503 because the server
 * doesn't have AZURE_SPEECH_KEY set — so a caller can always just ignore a
 * null result and carry on exactly as before this existed.
 */
import { api } from './api';
import { encodeWav, decodeAndResampleTo16kMono } from './wav-encode';

export interface WordAssessment {
  word: string;
  accuracyScore: number;
  errorType: string;
}

export interface PronunciationResult {
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  pronScore: number;
  words: WordAssessment[];
}

export function pronunciationRecordingSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    (typeof window.AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined')
  );
}

export interface ActiveRecording {
  /** Stops recording and resolves to the captured clip (or null on failure). */
  stop: () => Promise<Blob | null>;
}

/**
 * Starts capturing the mic RIGHT NOW and keeps going until stop() is
 * called — this must run concurrently with whatever else is listening
 * (e.g. lib/speech.ts's listenOnce), not after it, or it just records
 * silence once the learner has already finished speaking. Resolves null if
 * recording can't start at all (unsupported browser, mic denied).
 */
export function startRecording(): Promise<ActiveRecording | null> {
  if (!pronunciationRecordingSupported()) return Promise.resolve(null);

  return navigator.mediaDevices
    .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
    .then((stream) => {
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream);
      } catch {
        for (const t of stream.getTracks()) t.stop();
        return null;
      }

      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      let stopped = false;
      const stop = (): Promise<Blob | null> => {
        if (stopped) return Promise.resolve(null);
        stopped = true;
        return new Promise((resolve) => {
          recorder.onstop = () => {
            for (const t of stream.getTracks()) t.stop();
            resolve(chunks.length ? new Blob(chunks, { type: recorder.mimeType }) : null);
          };
          recorder.onerror = () => {
            for (const t of stream.getTracks()) t.stop();
            resolve(null);
          };
          if (recorder.state !== 'inactive') recorder.stop();
          else resolve(null);
        });
      };

      recorder.start();
      return { stop };
    })
    .catch(() => null);
}

/**
 * Encodes a recorded clip to the WAV format Azure needs and requests an
 * assessment against `referenceText`. Returns null on any failure — server
 * not configured (503), decode failure, or a network error.
 */
export async function assessPronunciationFromBlob(
  clip: Blob,
  referenceText: string,
  language?: string
): Promise<PronunciationResult | null> {
  try {
    const samples = await decodeAndResampleTo16kMono(clip);
    const wav = encodeWav(samples, 16000);
    const buf = await wav.arrayBuffer();

    const params = new URLSearchParams({ referenceText });
    if (language) params.set('language', language);

    const res = await api.post(`/tutor/pronunciation?${params.toString()}`, buf, {
      headers: { 'Content-Type': 'audio/wav' },
    });
    return res.data as PronunciationResult;
  } catch {
    return null;
  }
}
