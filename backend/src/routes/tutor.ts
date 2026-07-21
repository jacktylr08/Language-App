import { Router, Response } from 'express';
import { verifyToken, AuthRequest } from '@/middleware/auth';
import { tutorService } from '@/services/tutor-service';
import { logger } from '@/utils/logger';

const router = Router();

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Stateless conversational tutor.
 *
 * POST /api/v1/tutor/chat
 * Body: { messages: ChatMessage[], focus?: string, vocab?: string[], level?: string }
 *
 * The client keeps the running conversation and sends it up each turn, so this
 * works with the app's local curriculum and needs no database rows. If the AI
 * tutor isn't configured (no ANTHROPIC_API_KEY), we answer 503 so the UI can
 * show a friendly "not switched on yet" notice instead of a hard error.
 */
router.post('/chat', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { messages, focus, vocab, level } = req.body ?? {};

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'messages must be a non-empty array' });
      return;
    }

    // Sanitize: only keep well-formed user/assistant turns, cap history length
    // so a runaway client can't blow up token usage.
    const clean: ChatMessage[] = messages
      .filter(
        (m: any) =>
          m &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          m.content.trim().length > 0
      )
      .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 2000) }))
      .slice(-24);

    if (clean.length === 0 || clean[clean.length - 1].role !== 'user') {
      res.status(400).json({ error: 'The last message must be from the user' });
      return;
    }

    const reply = await tutorService.chat(clean, {
      level: typeof level === 'string' ? level : undefined,
      focus: typeof focus === 'string' ? focus : undefined,
      vocab: Array.isArray(vocab) ? vocab.filter((v: any) => typeof v === 'string') : undefined,
    });

    res.json({ reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to reach the tutor';
    // A missing key is a configuration state, not a crash — surface it as 503.
    if (message.includes('not configured') || message.includes('ANTHROPIC_API_KEY')) {
      res.status(503).json({ error: message, code: 'tutor_not_configured' });
      return;
    }
    logger.error('Tutor chat error:', message);
    res.status(500).json({ error: message });
  }
});

export default router;
