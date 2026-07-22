jest.mock('axios');

import axios from 'axios';
import {
  pronunciationConfigured,
  assessPronunciation,
} from '@/services/pronunciation-service';

const mockedPost = axios.post as jest.Mock;

describe('pronunciationConfigured', () => {
  const originalEnv = process.env;
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('is false when the Azure keys are not set', () => {
    process.env = { ...originalEnv, AZURE_SPEECH_KEY: undefined, AZURE_SPEECH_REGION: undefined };
    expect(pronunciationConfigured()).toBe(false);
  });

  it('is true only when both key and region are set', () => {
    process.env = { ...originalEnv, AZURE_SPEECH_KEY: 'k', AZURE_SPEECH_REGION: 'westeurope' };
    expect(pronunciationConfigured()).toBe(true);
  });

  it('is false with only one of the two set', () => {
    process.env = { ...originalEnv, AZURE_SPEECH_KEY: 'k', AZURE_SPEECH_REGION: undefined };
    expect(pronunciationConfigured()).toBe(false);
  });
});

describe('assessPronunciation', () => {
  const originalEnv = process.env;
  beforeEach(() => {
    process.env = { ...originalEnv, AZURE_SPEECH_KEY: 'test-key', AZURE_SPEECH_REGION: 'westeurope' };
    mockedPost.mockReset();
  });
  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws a tagged error when Azure is not configured, without calling the API', async () => {
    process.env.AZURE_SPEECH_KEY = undefined;
    await expect(assessPronunciation(Buffer.from('fake wav'), 'hola')).rejects.toMatchObject({
      code: 'pronunciation_not_configured',
    });
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('sends the reference text and correct headers, and parses the scores back out', async () => {
    mockedPost.mockResolvedValue({
      data: {
        NBest: [
          {
            PronunciationAssessment: {
              AccuracyScore: 92,
              FluencyScore: 88,
              CompletenessScore: 100,
              PronScore: 90,
            },
            Words: [
              {
                Word: 'hola',
                PronunciationAssessment: { AccuracyScore: 92, ErrorType: 'None' },
              },
            ],
          },
        ],
      },
    });

    const result = await assessPronunciation(Buffer.from('fake wav'), 'hola', 'Spanish');

    expect(result).toEqual({
      accuracyScore: 92,
      fluencyScore: 88,
      completenessScore: 100,
      pronScore: 90,
      words: [{ word: 'hola', accuracyScore: 92, errorType: 'None' }],
    });

    const [url, body, config] = mockedPost.mock.calls[0];
    expect(url).toContain('westeurope.stt.speech.microsoft.com');
    expect(url).toContain('language=es-ES');
    expect(body).toBeInstanceOf(Buffer);
    expect(config.headers['Ocp-Apim-Subscription-Key']).toBe('test-key');
    expect(config.headers['Content-Type']).toMatch(/audio\/wav/);

    const decodedHeader = JSON.parse(
      Buffer.from(config.headers['Pronunciation-Assessment'], 'base64').toString('utf8')
    );
    expect(decodedHeader.ReferenceText).toBe('hola');
    expect(decodedHeader.Granularity).toBe('Phoneme');
  });

  it('throws a clear error when Azure recognizes no speech at all', async () => {
    mockedPost.mockResolvedValue({ data: { NBest: [] } });
    await expect(assessPronunciation(Buffer.from('silence'), 'hola')).rejects.toThrow(/no speech/i);
  });
});
