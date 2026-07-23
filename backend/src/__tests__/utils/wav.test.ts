import { isValidWav } from '@/utils/wav';

function wavHeader(): Buffer {
  const buf = Buffer.alloc(44);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36, 4);
  buf.write('WAVE', 8, 'ascii');
  return buf;
}

describe('isValidWav', () => {
  it('accepts a well-formed WAV header', () => {
    expect(isValidWav(wavHeader())).toBe(true);
  });

  it('rejects a buffer with no RIFF/WAVE markers at all', () => {
    expect(isValidWav(Buffer.from('just some garbage bytes, not audio'))).toBe(false);
  });

  it('rejects a buffer that is too short to contain a WAV header', () => {
    expect(isValidWav(Buffer.from('RIFF'))).toBe(false);
  });

  it('rejects a buffer with the RIFF marker but the wrong format tag', () => {
    const buf = wavHeader();
    buf.write('FAKE', 8, 'ascii');
    expect(isValidWav(buf)).toBe(false);
  });

  it('rejects an empty buffer', () => {
    expect(isValidWav(Buffer.alloc(0))).toBe(false);
  });
});
