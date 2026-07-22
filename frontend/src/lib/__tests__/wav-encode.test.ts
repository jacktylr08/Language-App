import { encodeWav, buildWavBuffer } from '../wav-encode';

describe('buildWavBuffer', () => {
  it('writes a valid RIFF/WAVE header with the correct sizes', () => {
    const samples = new Float32Array([0, 0.5, -0.5, 1, -1]);
    const view = new DataView(buildWavBuffer(samples, 16000));

    expect(view.byteLength).toBe(44 + samples.length * 2); // header + 16-bit samples
    expect(view.getUint32(4, true)).toBe(36 + samples.length * 2); // RIFF chunk size
    expect(view.getUint16(20, true)).toBe(1); // PCM format
    expect(view.getUint16(22, true)).toBe(1); // mono
    expect(view.getUint32(24, true)).toBe(16000); // sample rate
    expect(view.getUint16(34, true)).toBe(16); // bits per sample
    expect(view.getUint32(40, true)).toBe(samples.length * 2); // data chunk size
  });

  it('writes the RIFF/WAVE/fmt /data chunk magic strings', () => {
    const view = new DataView(buildWavBuffer(new Float32Array([0]), 16000));
    const magic = (offset: number, len: number) => {
      let s = '';
      for (let i = 0; i < len; i++) s += String.fromCharCode(view.getUint8(offset + i));
      return s;
    };
    expect(magic(0, 4)).toBe('RIFF');
    expect(magic(8, 4)).toBe('WAVE');
    expect(magic(12, 4)).toBe('fmt ');
    expect(magic(36, 4)).toBe('data');
  });

  it('encodes sample values to 16-bit PCM correctly, including clipping at the edges', () => {
    const samples = new Float32Array([0, 1, -1, 2, -2]); // 2/-2 are out of range — must clip
    const view = new DataView(buildWavBuffer(samples, 16000));

    expect(view.getInt16(44 + 0, true)).toBe(0);
    expect(view.getInt16(44 + 2, true)).toBe(0x7fff); // +1.0
    expect(view.getInt16(44 + 4, true)).toBe(-0x8000); // -1.0
    expect(view.getInt16(44 + 6, true)).toBe(0x7fff); // clipped from 2.0
    expect(view.getInt16(44 + 8, true)).toBe(-0x8000); // clipped from -2.0
  });
});

describe('encodeWav', () => {
  it('produces a blob typed as audio/wav with the right byte length', () => {
    const samples = new Float32Array([0, 0.1, -0.1]);
    const blob = encodeWav(samples, 16000);
    expect(blob.type).toBe('audio/wav');
    expect(blob.size).toBe(44 + samples.length * 2);
  });
});
