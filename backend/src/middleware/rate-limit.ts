import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { AuthRequest } from '@/middleware/auth';

/**
 * Rate limiters for the two kinds of endpoint that need one:
 * - auth endpoints, where the risk is brute-forcing/spamming from one IP
 * - tutor voice endpoints, which call OpenAI and cost real money per hit —
 *   here the risk is a compromised token, a bug, or a client retry loop
 *   (exactly the shape of the freeze bug fixed earlier) running up a bill
 *   with nothing to stop it.
 */

const authMessage = { error: 'Too many attempts. Please wait a bit and try again.' };
const tutorMessage = { error: 'Too many requests right now. Please wait a moment and try again.' };

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: authMessage,
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: authMessage,
});

/**
 * Keyed by authenticated user (not IP) — these routes always run after
 * verifyToken, so req.userId is set. Falls back to IP (via express-rate-limit's
 * own helper, which normalizes IPv6 correctly) only if that's ever missing,
 * which shouldn't happen in practice.
 */
function userKey(req: AuthRequest): string {
  return req.userId || ipKeyGenerator(req.ip || 'unknown');
}

// One real-time voice session is several minutes of audio — generous but
// bounded so a stuck client can't open unlimited sessions per hour.
export const tutorRealtimeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userKey,
  message: tutorMessage,
});

// TTS is called often during normal lesson practice (every word/reply), so
// this needs headroom — just enough to stop a runaway loop, not normal use.
export const tutorSpeakLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userKey,
  message: tutorMessage,
});

// One grading call per writing exercise — at most a handful per lesson, so
// this just needs to stop abuse, not accommodate heavy legitimate use.
export const tutorWritingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userKey,
  message: tutorMessage,
});

// Subscribing/unsubscribing a device for push reminders happens once per
// device, rarely — generous headroom just to stop a retry loop.
export const pushLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userKey,
  message: tutorMessage,
});
