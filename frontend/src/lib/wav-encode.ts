/**
 * Builds the raw bytes of a 16-bit PCM WAV file — the exact format Azure's
 * Pronunciation Assessment REST API expects (16kHz, mono, 16-bit PCM).
 * Resample to 16kHz mono BEFORE calling this (see decodeAndResampleTo16kMono)
 * — this just writes the WAV container + PCM samples, it doesn't resample.
 * Separated from encodeWav (which wraps this in a Blob) so the actual byte
 * layout is directly testable without depending on jsdom's Blob polyfill,
 * which doesn't implement arrayBuffer().
 */
export function buildWavBuffer(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const bytesPerSample = 2; // 16-bit
  const blockAlign = bytesPerSample; // mono
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // byte rate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return buffer;
}

/** Wraps buildWavBuffer's bytes in a Blob, ready to send as a request body. */
export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = buildWavBuffer(samples, sampleRate);

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Decodes any browser-recorded audio blob (typically webm/opus from
 * MediaRecorder) and resamples it to 16kHz mono — what Azure's pronunciation
 * endpoint requires, regardless of what the mic actually captured at.
 */
export async function decodeAndResampleTo16kMono(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const decodeCtx = new AudioCtx();
  let decoded: AudioBuffer;
  try {
    decoded = await decodeCtx.decodeAudioData(arrayBuffer);
  } finally {
    void decodeCtx.close();
  }

  const targetRate = 16000;
  const targetLength = Math.ceil(decoded.duration * targetRate);
  const offlineCtx = new OfflineAudioContext(1, targetLength, targetRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = decoded;
  source.connect(offlineCtx.destination);
  source.start();
  const rendered = await offlineCtx.startRendering();
  return rendered.getChannelData(0);
}
