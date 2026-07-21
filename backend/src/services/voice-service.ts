import axios from 'axios';

const OPENAI_TTS_URL = 'https://api.openai.com/v1/audio/speech';

/**
 * Turn tutor text into natural, human-sounding speech using OpenAI's TTS
 * (the same voice engine as ChatGPT's voice mode). Claude still writes the
 * words — this only voices them.
 *
 * The OPENAI_API_KEY lives server-side and is never exposed to the browser.
 * When it isn't set we throw a tagged error so the route can answer 503 and
 * the client can quietly fall back to the free browser voice.
 */
export async function synthesizeSpeech(text: string): Promise<Buffer> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    const err = new Error('Voice is not configured (OPENAI_API_KEY is not set).');
    (err as any).code = 'voice_not_configured';
    throw err;
  }

  // "coral" / "shimmer" / "nova" are warm, friendly voices; overridable.
  const voice = process.env.OPENAI_TTS_VOICE || 'coral';

  const response = await axios.post(
    OPENAI_TTS_URL,
    {
      model: 'gpt-4o-mini-tts',
      voice,
      input: text,
      instructions:
        'You are a warm, friendly Latin American Spanish teacher talking with a beginner. ' +
        'Speak naturally and clearly in an encouraging tone, at a gentle, relaxed pace. ' +
        'Use a natural, neutral Latin American Spanish accent.',
      response_format: 'mp3',
    },
    {
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      responseType: 'arraybuffer',
      timeout: 30000,
    }
  );

  return Buffer.from(response.data);
}
