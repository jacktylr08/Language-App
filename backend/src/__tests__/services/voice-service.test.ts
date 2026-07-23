jest.mock('axios');

jest.mock('@/config/redis', () => ({
  redisClient: {
    isOpen: true,
    get: jest.fn(),
    set: jest.fn(),
  },
}));

import axios from 'axios';
import { synthesizeSpeech } from '@/services/voice-service';
import { redisClient } from '@/config/redis';

const mockedPost = axios.post as jest.Mock;
const mockedGet = redisClient.get as jest.Mock;
const mockedSet = redisClient.set as jest.Mock;

describe('synthesizeSpeech', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, OPENAI_API_KEY: 'test-key', OPENAI_TTS_VOICE: 'coral' };
    mockedPost.mockReset();
    mockedGet.mockReset();
    mockedSet.mockReset();
    (redisClient as { isOpen: boolean }).isOpen = true;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws a tagged error when OPENAI_API_KEY is not set, without calling OpenAI or Redis', async () => {
    process.env.OPENAI_API_KEY = undefined;

    await expect(synthesizeSpeech('hola')).rejects.toMatchObject({ code: 'voice_not_configured' });
    expect(mockedPost).not.toHaveBeenCalled();
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('calls OpenAI and populates the cache on a cache miss', async () => {
    mockedGet.mockResolvedValue(null);
    mockedPost.mockResolvedValue({ data: Buffer.from('fake-mp3-bytes') });

    const audio = await synthesizeSpeech('hola');

    expect(audio).toBeInstanceOf(Buffer);
    expect(mockedPost).toHaveBeenCalledTimes(1);
    expect(mockedSet).toHaveBeenCalledTimes(1);

    const [key, value, opts] = mockedSet.mock.calls[0];
    expect(key).toMatch(/^tts:/);
    expect(Buffer.from(value, 'base64').toString()).toBe('fake-mp3-bytes');
    expect(opts).toEqual({ EX: 30 * 24 * 60 * 60 });
  });

  it('returns the cached audio on a cache hit without calling OpenAI', async () => {
    mockedGet.mockResolvedValue(Buffer.from('cached-mp3-bytes').toString('base64'));

    const audio = await synthesizeSpeech('hola');

    expect(audio.toString()).toBe('cached-mp3-bytes');
    expect(mockedPost).not.toHaveBeenCalled();
    expect(mockedSet).not.toHaveBeenCalled();
  });

  it('keys the cache by both text and voice — different voices for the same text miss independently', async () => {
    mockedGet.mockResolvedValue(null);
    mockedPost.mockResolvedValue({ data: Buffer.from('a') });
    await synthesizeSpeech('hola');
    const keyA = mockedGet.mock.calls[0][0];

    mockedGet.mockClear();
    process.env.OPENAI_TTS_VOICE = 'nova';
    mockedGet.mockResolvedValue(null);
    await synthesizeSpeech('hola');
    const keyB = mockedGet.mock.calls[0][0];

    expect(keyA).not.toBe(keyB);
  });

  it('falls back to calling OpenAI when Redis is unavailable, without throwing', async () => {
    (redisClient as { isOpen: boolean }).isOpen = false;
    mockedPost.mockResolvedValue({ data: Buffer.from('fresh-bytes') });

    const audio = await synthesizeSpeech('hola');

    expect(audio.toString()).toBe('fresh-bytes');
    expect(mockedGet).not.toHaveBeenCalled();
    expect(mockedSet).not.toHaveBeenCalled();
  });

  it('still returns audio if the Redis read itself errors out', async () => {
    mockedGet.mockRejectedValue(new Error('redis exploded'));
    mockedPost.mockResolvedValue({ data: Buffer.from('fresh-bytes') });

    const audio = await synthesizeSpeech('hola');
    expect(audio.toString()).toBe('fresh-bytes');
  });
});
