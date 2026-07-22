import { Router, Response } from 'express';
import { verifyToken, AuthRequest } from '@/middleware/auth';
import { pushLimiter } from '@/middleware/rate-limit';
import { knexInstance } from '@/config/database';
import { getVapidPublicKey, pushConfigured } from '@/services/push-service';
import { logger } from '@/utils/logger';

const router = Router();

/**
 * Practice reminder push notifications.
 *
 * GET  /api/v1/push/public-key           -> { publicKey }  (503 if not configured)
 * POST /api/v1/push/subscribe   { subscription } -> { ok }
 * POST /api/v1/push/unsubscribe { endpoint }      -> { ok }
 *
 * `subscription` is exactly what PushManager.subscribe() returns client-side:
 * { endpoint, keys: { p256dh, auth } }. One row per device, keyed on endpoint
 * (re-subscribing the same device just updates its keys).
 */
router.get('/public-key', (_req, res: Response): void => {
  if (!pushConfigured()) {
    res.status(503).json({
      error: 'Push notifications are not configured on the server yet.',
      code: 'push_not_configured',
    });
    return;
  }
  res.json({ publicKey: getVapidPublicKey() });
});

router.post('/subscribe', pushLimiter, verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sub = req.body?.subscription;
    const endpoint = sub?.endpoint;
    const p256dh = sub?.keys?.p256dh;
    const auth = sub?.keys?.auth;
    if (typeof endpoint !== 'string' || typeof p256dh !== 'string' || typeof auth !== 'string') {
      res.status(400).json({ error: 'Malformed push subscription' });
      return;
    }

    await knexInstance('push_subscriptions')
      .insert({ user_id: req.userId, endpoint, p256dh, auth })
      .onConflict('endpoint')
      .merge({ user_id: req.userId, p256dh, auth });

    res.json({ ok: true });
  } catch (err: any) {
    logger.error('Push subscribe error:', err?.message ?? err);
    res.status(500).json({ error: 'Could not save your subscription' });
  }
});

router.post('/unsubscribe', pushLimiter, verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const endpoint = req.body?.endpoint;
    if (typeof endpoint !== 'string') {
      res.status(400).json({ error: 'endpoint is required' });
      return;
    }
    await knexInstance('push_subscriptions').where({ user_id: req.userId, endpoint }).delete();
    res.json({ ok: true });
  } catch (err: any) {
    logger.error('Push unsubscribe error:', err?.message ?? err);
    res.status(500).json({ error: 'Could not remove your subscription' });
  }
});

export default router;
