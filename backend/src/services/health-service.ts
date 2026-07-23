import { knexInstance } from '@/config/database';
import { redisClient } from '@/config/redis';
import { logger } from '@/utils/logger';

// How long the DB ping is allowed to take before we treat it as unreachable
// — kept short so the health check itself stays fast even when the DB is
// hanging rather than cleanly refusing connections.
const HEALTH_DB_TIMEOUT_MS = 2000;

export interface HealthStatus {
  status: 'ok' | 'degraded';
  timestamp: string;
  db: 'ok' | 'unreachable';
  redis: 'ok' | 'unavailable';
}

async function isDatabaseReachable(): Promise<boolean> {
  try {
    await Promise.race([
      knexInstance.raw('SELECT 1'),
      new Promise((_resolve, reject) =>
        setTimeout(() => reject(new Error('Database health check timed out')), HEALTH_DB_TIMEOUT_MS)
      ),
    ]);
    return true;
  } catch (err) {
    logger.warn(`Health check: database unreachable — ${err instanceof Error ? err.message : err}`);
    return false;
  }
}

/**
 * Actually verifies dependencies instead of unconditionally answering "ok".
 * The DB is load-bearing for almost every route, so if it's unreachable this
 * reports degraded/503-worthy status rather than lying to Railway (or
 * whatever's watching) that the service is healthy while every DB-dependent
 * request is actually failing. Redis is a best-effort cache (the app already
 * works without it), so its absence is reported but doesn't flip the overall
 * status.
 */
export async function getHealthStatus(): Promise<HealthStatus> {
  const dbOk = await isDatabaseReachable();
  const redisOk = redisClient.isOpen;

  return {
    status: dbOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    db: dbOk ? 'ok' : 'unreachable',
    redis: redisOk ? 'ok' : 'unavailable',
  };
}
