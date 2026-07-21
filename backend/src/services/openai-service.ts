import axios from 'axios';

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';

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
    const err = new Error(
      'AI tutor is not configured (OPENAI_API_KEY is not set). ' +
        'Set the key in your environment to enable it.'
    );
    (err as any).code = 'tutor_not_configured';
    throw err;
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
