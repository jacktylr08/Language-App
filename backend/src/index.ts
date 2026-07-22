import express, { Express, Request, Response } from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger } from '@/utils/logger';
import { initRedis } from '@/config/redis';
import { knexInstance } from '@/config/database';
import { errorHandler } from '@/middleware/auth';
import authRoutes from '@/routes/auth';
import tutorRoutes from '@/routes/tutor';
import stateRoutes from '@/routes/state';
import pushRoutes from '@/routes/push';
import { startReminderScheduler } from '@/services/reminder-scheduler';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3001;

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

// Start server
const start = async (): Promise<void> => {
  // Listen immediately so the platform health check can reach /health
  // even while the database is still coming up.
  app.listen(port, () => {
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

export default app;
