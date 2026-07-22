import axios from 'axios';

/**
 * Phoneme-level pronunciation scoring via Azure Speech's Pronunciation
 * Assessment REST API. Same optional-config shape as the OpenAI tutor and
 * push notifications: if the keys aren't set, we throw a tagged error so the
 * route can answer 503 (pronunciation_not_configured) instead of crashing —
 * the app's existing transcript-matching pronunciation check (Web Speech
 * API, client-side) keeps working exactly as before regardless.
 *
 * Needs an Azure Speech resource — set AZURE_SPEECH_KEY and
 * AZURE_SPEECH_REGION (e.g. "westeurope", the region your resource was
 * created in) in the environment to enable this.
 */
export function pronunciationConfigured(): boolean {
  return !!(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION);
}

function ensureConfigured(): { key: string; region: string } {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) {
    const err = new Error(
      'Pronunciation scoring is not configured (AZURE_SPEECH_KEY / AZURE_SPEECH_REGION are not set). ' +
        'Create an Azure Speech resource and set both in your environment to enable it.'
    );
    (err as any).code = 'pronunciation_not_configured';
    throw err;
  }
  return { key, region };
}

export interface WordAssessment {
  word: string;
  accuracyScore: number;
  errorType: 'None' | 'Omission' | 'Insertion' | 'Mispronunciation' | 'UnexpectedBreak' | 'MissingBreak' | 'Monotone';
}

export interface PronunciationResult {
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  pronScore: number;
  words: WordAssessment[];
}

// Azure's Speech locale codes for the languages the app might teach. Only
// Spanish exists as a real course today (see lib/languages.ts on the
// frontend) — this map is what a future second language's assessment calls
// would extend, not something to guess a value for on the fly.
const LOCALE_BY_LANGUAGE: Record<string, string> = {
  Spanish: 'es-ES',
};

/**
 * Scores one short recording (WAV, 16kHz 16-bit mono PCM) against the
 * Spanish text the learner was asked to say. Audio duration should be under
 * ~30s per Azure's own limit for this endpoint — callers should already be
 * sending single words/short phrases, never a full recording.
 */
export async function assessPronunciation(
  audioWav: Buffer,
  referenceText: string,
  language = 'Spanish'
): Promise<PronunciationResult> {
  const { key, region } = ensureConfigured();
  const locale = LOCALE_BY_LANGUAGE[language] || LOCALE_BY_LANGUAGE.Spanish;

  const assessmentConfig = {
    ReferenceText: referenceText,
    GradingSystem: 'HundredMark',
    Granularity: 'Phoneme',
    Dimension: 'Comprehensive',
    EnableMiscue: true,
  };
  const pronunciationHeader = Buffer.from(JSON.stringify(assessmentConfig), 'utf8').toString('base64');

  const url = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${encodeURIComponent(
    locale
  )}&format=detailed`;

  const response = await axios.post(url, audioWav, {
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
      Accept: 'application/json',
      'Pronunciation-Assessment': pronunciationHeader,
    },
    timeout: 15000,
  });

  const data = response.data ?? {};
  const nbest = data.NBest?.[0];
  if (!nbest) {
    throw new Error('No speech recognized in the recording.');
  }

  const pa = nbest.PronunciationAssessment ?? {};
  const words: WordAssessment[] = Array.isArray(nbest.Words)
    ? nbest.Words.map((w: any) => ({
        word: String(w.Word ?? ''),
        accuracyScore: Number(w.PronunciationAssessment?.AccuracyScore ?? 0),
        errorType: (w.PronunciationAssessment?.ErrorType || 'None') as WordAssessment['errorType'],
      }))
    : [];

  return {
    accuracyScore: Number(pa.AccuracyScore ?? 0),
    fluencyScore: Number(pa.FluencyScore ?? 0),
    completenessScore: Number(pa.CompletenessScore ?? 0),
    pronScore: Number(pa.PronScore ?? 0),
    words,
  };
}
