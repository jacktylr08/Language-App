import axios from 'axios';
import { codedError } from '@/utils/errors';

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_REALTIME_SECRET_URL = 'https://api.openai.com/v1/realtime/client_secrets';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export function openaiConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Chat completion via OpenAI (the tutor's "brain").
 *
 * Uses gpt-4o-mini by default — cheap, fast, and more than capable for a
 * beginner language tutor — overridable via OPENAI_CHAT_MODEL. The key lives
 * server-side. If it isn't set we throw a tagged error so the route can answer
 * 503 (tutor_not_configured) instead of crashing.
 */
export async function openaiChat(
  system: string,
  messages: ChatTurn[],
  opts: { maxTokens?: number; temperature?: number; json?: boolean } = {}
): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw codedError(
      'AI tutor is not configured (OPENAI_API_KEY is not set). ' +
        'Set the key in your environment to enable it.',
      'tutor_not_configured'
    );
  }

  const model = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';

  const response = await axios.post(
    OPENAI_CHAT_URL,
    {
      model,
      max_tokens: opts.maxTokens ?? 600,
      ...(typeof opts.temperature === 'number' ? { temperature: opts.temperature } : {}),
      // Ask the model for strict JSON when we need a machine-readable result
      // (used by the learner-profile reflection step).
      ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
      messages: [{ role: 'system', content: system }, ...messages],
    },
    {
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  const content = response.data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Unexpected response from OpenAI');
  }
  return content.trim();
}

// Every voice the Realtime API currently supports for speech-to-speech audio
// output. Kept here (not just inline in the route) so both the route's
// validation and any future caller share one source of truth.
export const REALTIME_VOICES = [
  'cedar',
  'marin',
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'sage',
  'shimmer',
  'verse',
] as const;
export type RealtimeVoice = (typeof REALTIME_VOICES)[number];

export interface RealtimeSessionConfig {
  instructions: string;
  /** Voice name (e.g. "cedar", "marin", "alloy"). */
  voice?: string;
}

export interface RealtimeSessionResult {
  /** The ephemeral client secret (ek_…) the browser uses to connect over WebRTC. */
  token: string;
  model: string;
  expiresAt: number | null;
}

/**
 * Mint a short-lived ephemeral client secret for the browser to open a WebRTC
 * connection to OpenAI's Realtime API (speech-to-speech). The real API key
 * never leaves the server — the browser only ever sees the ek_… token, which
 * is bound to this session config and expires in about a minute.
 *
 * Model defaults to gpt-realtime-mini (the cost-sensible realtime model),
 * overridable via OPENAI_REALTIME_MODEL. Voice via OPENAI_REALTIME_VOICE.
 */
export async function createRealtimeClientSecret(
  config: RealtimeSessionConfig
): Promise<RealtimeSessionResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw codedError(
      'AI tutor is not configured (OPENAI_API_KEY is not set).',
      'tutor_not_configured'
    );
  }

  const model = process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime-mini';
  const voice = config.voice || process.env.OPENAI_REALTIME_VOICE || 'cedar';

  const response = await axios.post(
    OPENAI_REALTIME_SECRET_URL,
    {
      session: {
        type: 'realtime',
        model,
        instructions: config.instructions,
        audio: {
          input: {
            transcription: { model: 'gpt-4o-mini-transcribe' },
            /**
             * Strip room noise before turn detection ever sees it.
             * `near_field` is tuned for a phone held near the face or a
             * headset, which is how this app is used. Without it, every
             * ambient sound is a candidate utterance.
             */
            noise_reduction: { type: 'near_field' },
            /**
             * Semantic VAD, not plain energy VAD.
             *
             * `server_vad` decides the learner has finished talking purely by
             * measuring silence, which is wrong twice over for a language
             * tutor: it cuts off a beginner who pauses to search for a word,
             * and it treats any noise as the start of a turn. `semantic_vad`
             * asks a model whether what it heard actually sounds like a
             * finished thought.
             *
             * `eagerness: 'low'` makes it wait longer before taking the
             * floor. For a learner assembling a sentence one word at a time,
             * being given a moment matters far more than snappy turn-taking —
             * a real tutor lets you finish.
             */
            turn_detection: { type: 'semantic_vad', eagerness: 'low' },
          },
          output: { voice },
        },
      },
    },
    {
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    }
  );

  // The client-secrets response has evolved; accept both the flat and nested
  // shapes so a minor API revision doesn't break us.
  const data = response.data ?? {};
  const token: string | undefined = data.value ?? data.client_secret?.value;
  if (!token) {
    throw new Error('Realtime session did not return a client secret');
  }

  return {
    token,
    model,
    expiresAt: data.expires_at ?? data.client_secret?.expires_at ?? null,
  };
}
