import express, { Express, Request, Response } from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import type { Server } from 'http';
import { logger } from '@/utils/logger';
import { initRedis, redisClient } from '@/config/redis';
import { knexInstance } from '@/config/database';
import { errorHandler } from '@/middleware/auth';
import authRoutes from '@/routes/auth';
import tutorRoutes from '@/routes/tutor';
import stateRoutes from '@/routes/state';
import pushRoutes from '@/routes/push';
import { startReminderScheduler } from '@/services/reminder-scheduler';
import { getHealthStatus } from '@/services/health-service';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3001;

// Railway (and every platform PaaS) sits behind an edge proxy that sets
// X-Forwarded-For on every request. Without `trust proxy`, express-rate-limit's
// default keyGenerator throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR the moment
// that header shows up — which took down every /auth/register and /auth/login
// request in production (those two limiters are the only ones using the
// default IP-based keyGenerator). `1` trusts exactly one hop, matching a
// single reverse proxy in front of this process.
app.set('trust proxy', 1);

// CORS: scoped to CORS_ORIGIN (comma-separated) when set. Bearer-token auth
// limits the real-world blast radius of a wide-open origin, but it should
// still be locked down in production. Defaults to allow-all only so this
// doesn't silently break the app before the env var is configured — set
// CORS_ORIGIN to the real frontend URL(s) to close this off.
const corsOrigins = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean);
if (!corsOrigins?.length) {
  logger.warn(
    'CORS_ORIGIN is not set — allowing all origins. Set it to your frontend URL(s) (comma-separated) to lock this down.'
  );
}

// Middleware
app.use(cors(corsOrigins?.length ? { origin: corsOrigins } : undefined));
// body-parser defaults to 100KB, which sat silently BELOW the 512KB ceiling
// routes/state.ts advertises — so a learner with enough history (tutor
// transcripts alone can run to a couple of hundred KB) would quietly stop
// being able to save, with a generic 500 rather than the intended 413. Keep
// this comfortably above MAX_STATE_BYTES so the route's own check is the one
// that decides. Everything else stays on the small default.
app.use('/api/v1/state', express.json({ limit: '1mb' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check — actually verifies dependencies (DB reachability, Redis
// status) instead of unconditionally answering "ok"; see health-service.ts.
// Railway (or whatever's watching) should not see "healthy" while every
// DB-dependent route is actually broken.
app.get('/health', async (_req: Request, res: Response) => {
  const health = await getHealthStatus();
  res.status(health.status === 'ok' ? 200 : 503).json(health);
});

// API status
app.get('/api/v1/status', (_req: Request, res: Response) => {
  res.json({
    status: 'operational',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tutor', tutorRoutes);
app.use('/api/v1/state', stateRoutes);
app.use('/api/v1/push', pushRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handling middleware
app.use(errorHandler);

let httpServer: Server | undefined;

// Start server
const start = async (): Promise<void> => {
  // Listen immediately so the platform health check can reach /health
  // even while the database is still coming up.
  httpServer = app.listen(port, () => {
    logger.info(`Server running on port ${port}`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
  });

  if (!process.env.DATABASE_URL) {
    logger.warn(
      'DATABASE_URL is not set — falling back to localhost. On Railway, add a variable DATABASE_URL = ${{Postgres.DATABASE_URL}}'
    );
  }
  if (!process.env.REDIS_URL) {
    logger.warn(
      'REDIS_URL is not set — falling back to localhost. On Railway, add a variable REDIS_URL = ${{Redis.REDIS_URL}}'
    );
  }

  // Redis is non-fatal: the app works without cache.
  initRedis()
    .then(() => logger.info('Redis connected'))
    .catch((err) =>
      logger.warn(`Redis unavailable — continuing without cache: ${err.message}`)
    );

  // Database: connect and migrate automatically.
  try {
    await knexInstance.raw('SELECT 1');
    logger.info('Database connected');

    const migrationsDir = path.join(__dirname, 'database/migrations');
    const [batch, applied] = await knexInstance.migrate.latest({
      directory: migrationsDir,
    });
    if (applied.length > 0) {
      logger.info(`Ran ${applied.length} migration(s) (batch ${batch})`);
    } else {
      logger.info('Database schema up to date');
    }

    startReminderScheduler();
  } catch (error) {
    logger.error(
      `Database setup failed — API will not work until this is fixed: ${
        error instanceof Error ? error.message : error
      }`
    );
  }
};

start();

// Graceful shutdown: on SIGTERM/SIGINT (Railway/Docker send SIGTERM on every
// deploy or restart), stop accepting new connections, give in-flight
// requests a bounded window to finish, then close the DB/Redis connections
// cleanly before exiting. Without this, in-flight requests get killed
// mid-response and connections are left dangling instead of closed properly.
const SHUTDOWN_TIMEOUT_MS = 10000;
let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received — shutting down gracefully`);

  const forceExitTimer = setTimeout(() => {
    logger.warn(`Graceful shutdown did not finish within ${SHUTDOWN_TIMEOUT_MS}ms — forcing exit`);
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExitTimer.unref();

  try {
    if (httpServer) {
      await new Promise<void>((resolve, reject) => {
        httpServer!.close((err) => (err ? reject(err) : resolve()));
      });
      logger.info('HTTP server closed — no longer accepting new connections');
    }
  } catch (err) {
    logger.error('Error closing HTTP server:', err);
  }

  try {
    await knexInstance.destroy();
    logger.info('Database connection closed');
  } catch (err) {
    logger.error('Error closing database connection:', err);
  }

  try {
    if (redisClient.isOpen) {
      await redisClient.quit();
      logger.info('Redis connection closed');
    }
  } catch (err) {
    logger.error('Error closing Redis connection:', err);
  }

  clearTimeout(forceExitTimer);
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

export default app;
