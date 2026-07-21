import { Router, Response } from 'express';
import { verifyToken, AuthRequest } from '@/middleware/auth';
import { knexInstance } from '@/config/database';
import { logger } from '@/utils/logger';

const router = Router();

// Guard against a runaway client pushing a huge blob. A learner's full state
// (progress + tutor memory) is a few KB; 512KB is a very generous ceiling.
const MAX_STATE_BYTES = 512 * 1024;

/**
 * Cross-device user state (progress, tutor memory, onboarding flag).
 *
 * GET  /api/v1/state        -> { data, updatedAt }
 * PUT  /api/v1/state  { data } -> { ok, updatedAt }
 *
 * The client owns the shape of `data`; the server just stores and returns it.
 * Merging (so two devices don't clobber each other) happens client-side.
 */
router.get('/', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const row = await knexInstance('user_state').where({ user_id: req.userId }).first();
    res.json({ data: row?.data ?? {}, updatedAt: row?.updated_at ?? null });
  } catch (err: any) {
    logger.error('State GET error:', err?.message ?? err);
    res.status(500).json({ error: 'Failed to load your data' });
  }
});

router.put('/', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data } = req.body ?? {};
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      res.status(400).json({ error: 'data must be an object' });
      return;
    }

    const json = JSON.stringify(data);
    if (Buffer.byteLength(json, 'utf8') > MAX_STATE_BYTES) {
      res.status(413).json({ error: 'State is too large' });
      return;
    }

    const now = knexInstance.fn.now();
    // Bind the JSON as text and cast to jsonb so we never depend on knex's
    // object-serialization behaviour.
    const jsonb = knexInstance.raw('?::jsonb', [json]);

    await knexInstance('user_state')
      .insert({ user_id: req.userId, data: jsonb, updated_at: now })
      .onConflict('user_id')
      .merge({ data: jsonb, updated_at: now });

    res.json({ ok: true, updatedAt: new Date().toISOString() });
  } catch (err: any) {
    logger.error('State PUT error:', err?.message ?? err);
    res.status(500).json({ error: 'Failed to save your data' });
  }
});

export default router;
