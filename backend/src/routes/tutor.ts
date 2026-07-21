import { Router, Response } from 'express';
import { verifyToken, AuthRequest } from '@/middleware/auth';
import { tutorService } from '@/services/tutor-service';
import { synthesizeSpeech } from '@/services/voice-service';
import { logger } from '@/utils/logger';

const router = Router();

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Keep only well-formed user/assistant turns and cap history length so a
 * runaway client can't blow up token usage.
 */
function sanitizeMessages(messages: any[]): ChatMessage[] {
  return messages
    .filter(
      (m: any) =>
        m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim().length > 0
    )
    .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 2000) }))
    .slice(-30);
}

/**
 * Stateless conversational tutor.
 *
 * POST /api/v1/tutor/chat
 * Body: { messages: ChatMessage[], focus?: string, vocab?: string[], level?: string }
 *
 * The client keeps the running conversation and sends it up each turn, so this
 * works with the app's local curriculum and needs no database rows. If the AI
 * tutor isn't configured (no OPENAI_API_KEY), we answer 503 so the UI can
 * show a friendly "not switched on yet" notice instead of a hard error.
 */
router.post('/chat', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { messages, focus, vocab, level, weekReached, knownVocab, weaknesses, strengths, profileSummary, learnerName } =
      req.body ?? {};

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'messages must be a non-empty array' });
      return;
    }

    const clean = sanitizeMessages(messages);

    if (clean.length === 0 || clean[clean.length - 1].role !== 'user') {
      res.status(400).json({ error: 'The last message must be from the user' });
      return;
    }

    const strList = (v: any): string[] | undefined =>
      Array.isArray(v) ? v.filter((x: any) => typeof x === 'string' && x.trim()) : undefined;

    const reply = await tutorService.chat(clean, {
      level: typeof level === 'string' ? level : undefined,
      focus: typeof focus === 'string' ? focus : undefined,
      vocab: strList(vocab),
      weekReached: typeof weekReached === 'number' ? weekReached : undefined,
      knownVocab: strList(knownVocab),
      weaknesses: strList(weaknesses),
      strengths: strList(strengths),
      profileSummary: typeof profileSummary === 'string' ? profileSummary.slice(0, 800) : undefined,
      learnerName: typeof learnerName === 'string' ? learnerName.slice(0, 60) : undefined,
    });

    res.json({ reply });
  } catch (err: any) {
    const message = err instanceof Error ? err.message : 'Failed to reach the tutor';
    // A missing key is a configuration state, not a crash — surface it as 503.
    if (err?.code === 'tutor_not_configured' || message.includes('not configured')) {
      res.status(503).json({ error: message, code: 'tutor_not_configured' });
      return;
    }
    logger.error('Tutor chat error:', err?.response?.status ?? '', message);
    res.status(500).json({ error: message });
  }
});

/**
 * Reflect on a conversation and return an updated learner profile (what the
 * learner is good at, weak at, and a running summary). The client persists the
 * result so the next session picks up where this one left off.
 *
 * POST /api/v1/tutor/reflect
 * Body: { messages: ChatMessage[], profile?: LearnerProfile }
 */
router.post('/reflect', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { messages, profile } = req.body ?? {};

    if (!Array.isArray(messages) || messages.length < 2) {
      res.status(400).json({ error: 'messages must contain at least a couple of turns' });
      return;
    }

    const clean = sanitizeMessages(messages);
    const previous =
      profile && typeof profile === 'object'
        ? {
            summary: typeof profile.summary === 'string' ? profile.summary : '',
            strengths: Array.isArray(profile.strengths) ? profile.strengths : [],
            weaknesses: Array.isArray(profile.weaknesses) ? profile.weaknesses : [],
            mistakes: Array.isArray(profile.mistakes) ? profile.mistakes : [],
            updatedAt: typeof profile.updatedAt === 'string' ? profile.updatedAt : '',
          }
        : null;

    const updated = await tutorService.reflect(clean, previous);
    res.json({ profile: updated });
  } catch (err: any) {
    const message = err instanceof Error ? err.message : 'Failed to update the learner profile';
    if (err?.code === 'tutor_not_configured' || message.includes('not configured')) {
      res.status(503).json({ error: message, code: 'tutor_not_configured' });
      return;
    }
    logger.error('Tutor reflect error:', err?.response?.status ?? '', message);
    res.status(500).json({ error: message });
  }
});

/**
 * Text-to-speech for the tutor's reply — returns natural, human-sounding
 * MP3 audio (OpenAI voices).
 *
 * POST /api/v1/tutor/speak
 * Body: { text: string }
 *
 * Returns audio/mpeg on success. If voice isn't configured (no OPENAI_API_KEY)
 * we answer 503 so the client can fall back to the free browser voice.
 */
router.post('/speak', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { text } = req.body ?? {};
    if (typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ error: 'text is required' });
      return;
    }

    // Cap length so a runaway request can't rack up cost or latency.
    const audio = await synthesizeSpeech(text.trim().slice(0, 800));

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.send(audio);
  } catch (err: any) {
    if (err?.code === 'voice_not_configured') {
      res.status(503).json({ error: err.message, code: 'voice_not_configured' });
      return;
    }
    // Don't log the raw arraybuffer error body — just the status.
    logger.error('Tutor speak error:', err?.response?.status ?? '', err?.message ?? err);
    res.status(502).json({ error: 'The voice service failed.' });
  }
});

export default router;
