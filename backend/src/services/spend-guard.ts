/**
 * A ceiling on what the app can spend at OpenAI in a day.
 *
 * The per-route rate limiters bound what any ONE learner can do in a window.
 * Nothing bounded the total. With N learners the ceiling was "N × the
 * per-user limit", which grows with signups and is discovered from a
 * statement rather than an alert. A live voice session is by far the most
 * expensive thing here, so it gets both a per-learner daily budget and a
 * global one.
 *
 * Counters live in Redis, keyed by UTC day and expiring after 48h, so this
 * costs one INCR per session and needs no cleanup.
 *
 * Failure mode is deliberate: if Redis is unavailable the guard ALLOWS the
 * request. A cache outage must not take the tutor offline, and the per-user
 * rate limiters are still in force underneath. It's a budget, not a
 * security control.
 */

import { redisClient } from '@/config/redis';
import { logger } from '@/utils/logger';

/** Sessions per learner per day. A committed learner does a handful. */
const DAILY_SESSIONS_PER_USER = Number(process.env.REALTIME_DAILY_SESSIONS_PER_USER ?? 12);

/**
 * Sessions across all learners per day. Sized for the current roster with a
 * lot of headroom — the point is to catch a leaked token or a retry storm,
 * not to ration normal use. Raise it as the user count grows.
 */
const DAILY_SESSIONS_GLOBAL = Number(process.env.REALTIME_DAILY_SESSIONS_GLOBAL ?? 300);

/** Warn once per day per scope as a budget gets close, so it's not a surprise. */
const WARN_AT = 0.8;

const TTL_SECONDS = 48 * 60 * 60;

function dayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface SpendDecision {
  allowed: boolean;
  /** Which ceiling was hit — for the client's message, and for the logs. */
  scope?: 'user' | 'global';
  used?: number;
  limit?: number;
}

/**
 * Counts one realtime session against both budgets and says whether it may
 * proceed. Call this immediately BEFORE minting a client secret — the token
 * is what costs money, so the count has to happen even if the learner then
 * abandons the call.
 */
export async function chargeRealtimeSession(userId: string): Promise<SpendDecision> {
  if (!redisClient.isOpen) return { allowed: true };

  try {
    const day = dayKey();
    const userKey = `spend:realtime:${day}:user:${userId}`;
    const globalKey = `spend:realtime:${day}:global`;

    // Global first: if the whole app is over budget, don't consume the
    // learner's own allowance on a session they can't have.
    const globalUsed = await bump(globalKey);
    if (globalUsed > DAILY_SESSIONS_GLOBAL) {
      logger.error(
        `Global realtime budget exhausted: ${globalUsed - 1}/${DAILY_SESSIONS_GLOBAL} sessions today. ` +
          'Voice calls are refusing until UTC midnight — raise REALTIME_DAILY_SESSIONS_GLOBAL if this is legitimate.'
      );
      return { allowed: false, scope: 'global', used: globalUsed - 1, limit: DAILY_SESSIONS_GLOBAL };
    }
    warnNearLimit(globalUsed, DAILY_SESSIONS_GLOBAL, 'global');

    const userUsed = await bump(userKey);
    if (userUsed > DAILY_SESSIONS_PER_USER) {
      return { allowed: false, scope: 'user', used: userUsed - 1, limit: DAILY_SESSIONS_PER_USER };
    }

    return { allowed: true, used: userUsed, limit: DAILY_SESSIONS_PER_USER };
  } catch (err) {
    // Budget tracking is best-effort — never the reason a lesson fails.
    logger.warn(`Spend guard unavailable, allowing request: ${err instanceof Error ? err.message : err}`);
    return { allowed: true };
  }
}

async function bump(key: string): Promise<number> {
  const value = await redisClient.incr(key);
  // Only set the expiry on first write, so the window is a real day rather
  // than sliding forward with every session.
  if (value === 1) await redisClient.expire(key, TTL_SECONDS);
  return value;
}

const warned = new Set<string>();
function warnNearLimit(used: number, limit: number, scope: string): void {
  const mark = `${dayKey()}:${scope}`;
  if (used < limit * WARN_AT || warned.has(mark)) return;
  warned.add(mark);
  logger.warn(`Realtime ${scope} budget at ${used}/${limit} for ${dayKey()}.`);
}

/** Today's usage, for the health endpoint — visibility without a dashboard. */
export async function realtimeUsageToday(): Promise<{ used: number; limit: number } | null> {
  if (!redisClient.isOpen) return null;
  try {
    const raw = await redisClient.get(`spend:realtime:${dayKey()}:global`);
    return { used: Number(raw ?? 0), limit: DAILY_SESSIONS_GLOBAL };
  } catch {
    return null;
  }
}
