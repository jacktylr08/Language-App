import { loadTutorVoice, saveTutorVoice, TUTOR_VOICES } from '../tutor-voice';

describe('tutor-voice', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to cedar when nothing has been chosen', () => {
    expect(loadTutorVoice()).toBe('cedar');
  });

  it('persists and reloads a chosen voice', () => {
    saveTutorVoice('marin');
    expect(loadTutorVoice()).toBe('marin');
  });

  it('falls back to the default rather than trusting a corrupted/unknown stored value', () => {
    localStorage.setItem('aprende-tutor-voice-v1', 'not-a-real-voice');
    expect(loadTutorVoice()).toBe('cedar');
  });

  it('every option has a distinct id matching a real voice name', () => {
    const ids = TUTOR_VOICES.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
