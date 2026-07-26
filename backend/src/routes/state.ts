import { Router, Response } from 'express';
import { verifyToken, AuthRequest } from '@/middleware/auth';
import { stateLimiter } from '@/middleware/rate-limit';
import { knexInstance } from '@/config/database';
import { logger } from '@/utils/logger';
import { errorMessage } from '@/utils/errors';

const router = Router();

// Guard against a runaway client pushing a huge blob. A learner's full state
// (progress + tutor memory, including capped session transcripts) is well
// under this. Note index.ts must keep express.json()'s limit ABOVE this, or
// oversized bodies get rejected by body-parser before this check is reached.
const MAX_STATE_BYTES = 512 * 1024;

// How many previous snapshots to keep per user. Enough to walk back from a
// bad write without letting the table grow without bound.
const HISTORY_LIMIT = 20;

/**
 * Cross-device learner state (progress, tutor memory, onboarding flag).
 *
 * GET  /api/v1/state                          -> { data, updatedAt, version }
 * PUT  /api/v1/state { data, baseVersion? }   -> { ok, updatedAt, version }
 *                                             -> 409 { conflict, data, version }
 *
 * The client owns the shape of `data`; the server stores it, versions it, and
 * keeps the previous few snapshots.
 *
 * Concurrency: a client that read version N sends baseVersion: N. If the
 * stored version has moved on since, the write is REJECTED with 409 and the
 * current state — the client re-merges and retries, rather than silently
 * erasing whatever the other device saved. Omitting baseVersion is a
 * deliberate force-write, used only for a first push where there's nothing
 * to conflict with.
 */
router.get('/', verifyToken, stateLimiter, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const row = await knexInstance('user_state').where({ user_id: req.userId }).first();
    res.json({
      data: row?.data ?? {},
      updatedAt: row?.updated_at ?? null,
      version: row?.version ?? 0,
    });
  } catch (err: unknown) {
    logger.error('State GET error:', errorMessage(err));
    res.status(500).json({ error: 'Failed to load your data' });
  }
});

router.put('/', verifyToken, stateLimiter, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data, baseVersion } = req.body ?? {};
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      res.status(400).json({ error: 'data must be an object' });
      return;
    }

    const json = JSON.stringify(data);
    if (Buffer.byteLength(json, 'utf8') > MAX_STATE_BYTES) {
      res.status(413).json({ error: 'State is too large' });
      return;
    }

    const result = await knexInstance.transaction(async (trx) => {
      // Lock the row so two concurrent writes for the same user can't both
      // pass the version check.
      const current = await trx('user_state').where({ user_id: req.userId }).forUpdate().first();

      if (
        current &&
        typeof baseVersion === 'number' &&
        baseVersion !== current.version
      ) {
        return { conflict: true as const, current };
      }

      // Snapshot what we're about to replace, so this write is reversible.
      if (current) {
        await trx('user_state_history').insert({
          user_id: req.userId,
          data: trx.raw('?::jsonb', [JSON.stringify(current.data)]),
          version: current.version,
        });

        // Keep only the most recent HISTORY_LIMIT snapshots for this user.
        await trx.raw(
          `DELETE FROM user_state_history
            WHERE user_id = ?
              AND id NOT IN (
                SELECT id FROM user_state_history
                 WHERE user_id = ?
                 ORDER BY id DESC
                 LIMIT ?
              )`,
          [req.userId, req.userId, HISTORY_LIMIT]
        );
      }

      const nextVersion = (current?.version ?? 0) + 1;
      const jsonb = trx.raw('?::jsonb', [json]);

      await trx('user_state')
        .insert({
          user_id: req.userId,
          data: jsonb,
          version: nextVersion,
          updated_at: trx.fn.now(),
        })
        .onConflict('user_id')
        .merge({ data: jsonb, version: nextVersion, updated_at: trx.fn.now() });

      return { conflict: false as const, version: nextVersion };
    });

    if (result.conflict) {
      // Not an error the learner should ever see — the client resolves it by
      // merging and retrying. Returning the current state saves a round trip.
      res.status(409).json({
        conflict: true,
        data: result.current.data,
        version: result.current.version,
        updatedAt: result.current.updated_at,
      });
      return;
    }

    res.json({ ok: true, updatedAt: new Date().toISOString(), version: result.version });
  } catch (err: unknown) {
    logger.error('State PUT error:', errorMessage(err));
    res.status(500).json({ error: 'Failed to save your data' });
  }
});

export default router;
