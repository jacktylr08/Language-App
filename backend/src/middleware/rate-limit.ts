import rateLimit, { ipKeyGenerator, type Options, type Store } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import jwt from 'jsonwebtoken';
import type { Request } from 'express';
import type { AuthRequest } from '@/middleware/auth';
import { redisClient } from '@/config/redis';
import { logger } from '@/utils/logger';

/**
 * Rate limiters for the two kinds of endpoint that need one:
 * - auth endpoints, where the risk is brute-forcing/spamming from one IP
 * - tutor voice endpoints, which call OpenAI and cost real money per hit —
 *   here the risk is a compromised token, a bug, or a client retry loop
 *   (exactly the shape of the freeze bug fixed earlier) running up a bill
 *   with nothing to stop it.
 *
 * Counters live in Redis, not in process memory. In memory they reset on
 * every deploy — which on Railway is every push — and each instance keeps
 * its own tally, so running two instances silently doubles every limit. A
 * limit that resets whenever you ship is not a limit.
 */

const authMessage = { error: 'Too many attempts. Please wait a bit and try again.' };
const tutorMessage = { error: 'Too many requests right now. Please wait a moment and try again.' };

/**
 * A Redis-backed store, or undefined to fall back to the in-memory default.
 *
 * Redis is optional in this app (index.ts treats it as non-fatal and the app
 * runs fine without cache), so this has to cope with it never connecting.
 * Paired with passOnStoreError below: if Redis goes away mid-flight, requests
 * pass rather than 500. That trades a bounded window of unlimited requests
 * for staying up, which is the right way round — a Redis blip must not take
 * out sign-in for everybody.
 */
function sharedStore(name: string): Store | undefined {
  if (!process.env.REDIS_URL) return undefined;
  return new RedisStore({
    prefix: `rl:${name}:`,
    sendCommand: async (...args: string[]) => {
      // isOpen guards the window before connect() resolves and after a drop —
      // sendCommand would otherwise queue or reject.
      if (!redisClient.isOpen) throw new Error('redis not connected');
      return redisClient.sendCommand(args) as Promise<never>;
    },
  }) as unknown as Store;
}

/** Every limiter shares the same store wiring and failure behaviour. */
function limiter(name: string, options: Partial<Options>) {
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    store: sharedStore(name),
    // Availability over strictness — see sharedStore.
    passOnStoreError: true,
    ...options,
  });
}

if (!process.env.REDIS_URL) {
  logger.warn(
    'REDIS_URL is not set — rate limits are per-process and reset on every restart. Set it in production.'
  );
}

export const loginLimiter = limiter('login', {
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: authMessage,
});

export const registerLimiter = limiter('register', {
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: authMessage,
});

/**
 * /auth/refresh runs before any auth middleware (there's no access token to
 * check yet — that's the point), so it can't use the userKey pattern as-is.
 * Instead we decode (not verify — this only needs the claim for keying, the
 * service layer does the real verification) the refresh token out of the
 * body to key by user, falling back to IP if that's missing or malformed.
 */
function refreshKey(req: Request): string {
  try {
    const token = (req.body as { refreshToken?: unknown } | undefined)?.refreshToken;
    if (typeof token === 'string') {
      const decoded = jwt.decode(token) as { userId?: string } | null;
      if (decoded && typeof decoded.userId === 'string' && decoded.userId) {
        return decoded.userId;
      }
    }
  } catch {
    // Fall through to IP-based keying below.
  }
  return ipKeyGenerator(req.ip || 'unknown');
}

export const refreshLimiter = limiter('refresh', {
  windowMs: 15 * 60 * 1000,
  limit: 30,
  keyGenerator: refreshKey,
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

// A text chat turn happens once per message in a back-and-forth conversation,
// so this needs real headroom for legitimate use — bounded mainly to stop a
// runaway retry loop or a leaked token from running up an unbounded OpenAI bill.
export const tutorChatLimiter = limiter('chat', {
  windowMs: 15 * 60 * 1000,
  limit: 120,
  keyGenerator: userKey,
  message: tutorMessage,
});

// Reflection runs once at the end of a session (or a few times in a long one),
// never per-message — much tighter headroom than chat is appropriate.
export const tutorReflectLimiter = limiter('reflect', {
  windowMs: 15 * 60 * 1000,
  limit: 30,
  keyGenerator: userKey,
  message: tutorMessage,
});

// One real-time voice session is several minutes of audio — generous but
// bounded so a stuck client can't open unlimited sessions per hour.
export const tutorRealtimeLimiter = limiter('realtime', {
  windowMs: 60 * 60 * 1000,
  limit: 20,
  keyGenerator: userKey,
  message: tutorMessage,
});

// TTS is called often during normal lesson practice (every word/reply), so
// this needs headroom — just enough to stop a runaway loop, not normal use.
export const tutorSpeakLimiter = limiter('speak', {
  windowMs: 15 * 60 * 1000,
  limit: 120,
  keyGenerator: userKey,
  message: tutorMessage,
});

// One grading call per writing exercise — at most a handful per lesson, so
// this just needs to stop abuse, not accommodate heavy legitimate use.
export const tutorWritingLimiter = limiter('writing', {
  windowMs: 15 * 60 * 1000,
  limit: 60,
  keyGenerator: userKey,
  message: tutorMessage,
});

// Called once per "speak" exercise attempt — similar cadence to TTS, so
// similar headroom.
export const pronunciationLimiter = limiter('pron', {
  windowMs: 15 * 60 * 1000,
  limit: 120,
  keyGenerator: userKey,
  message: tutorMessage,
});

// Progress sync was the one authenticated write with no limiter at all.
// Every PUT inserts a user_state_history row and runs a prune, so a client
// stuck in a retry loop churns that table and holds connections open. The
// client debounces at 1.5s and coalesces concurrent pushes, so real use is
// nowhere near this — it exists purely to bound the abnormal case.
export const stateLimiter = limiter('state', {
  windowMs: 15 * 60 * 1000,
  limit: 120,
  keyGenerator: userKey,
  message: { error: 'Saving too frequently. Your progress is safe — please wait a moment.' },
});

// Subscribing/unsubscribing a device for push reminders happens once per
// device, rarely — generous headroom just to stop a retry loop.
export const pushLimiter = limiter('push', {
  windowMs: 15 * 60 * 1000,
  limit: 30,
  keyGenerator: userKey,
  message: tutorMessage,
});
