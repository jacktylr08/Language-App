/**
 * Cheap sanity check that a buffer is actually a WAV file (RIFF container,
 * WAVE format) before it's trusted with anything expensive — bytes 0-3 must
 * be 'RIFF' and bytes 8-11 must be 'WAVE'. This doesn't validate the full
 * format (sample rate, bit depth, etc.), just enough to reject obviously
 * bogus input cheaply.
 */
export function isValidWav(buf: Buffer): boolean {
  return (
    buf.length >= 12 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WAVE'
  );
}
