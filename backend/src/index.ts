import express, { Express, Request, Response } from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger } from '@/utils/logger';
import { initRedis } from '@/config/redis';
import { knexInstance } from '@/config/database';
import { errorHandler } from '@/middleware/auth';
import authRoutes from '@/routes/auth';
import lessonsRoutes from '@/routes/lessons';
import vocabularyRoutes from '@/routes/vocabulary';
import reviewsRoutes from '@/routes/reviews';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
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
app.use('/api/v1/lessons', lessonsRoutes);
app.use('/api/v1/vocabulary', vocabularyRoutes);
app.use('/api/v1/reviews', reviewsRoutes);

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

  // Database: connect, migrate, and seed automatically.
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

    // Seed when there are no lessons yet. The seed only touches content
    // tables (never users or their progress), so this is safe to run on a
    // database that already has registered users.
    const [{ count }] = await knexInstance('lessons').count('id as count');
    if (Number(count) === 0) {
      logger.info('No lessons found — seeding initial content...');
      await knexInstance.seed.run({
        directory: path.join(__dirname, 'database/seeds'),
      });
      logger.info('Seed data inserted');
    } else {
      logger.info(`Content already seeded (${count} lessons)`);
    }

    // One-off data hygiene: earlier seeds stored non-existent placeholder
    // audio URLs, which render a broken player. Null them out so the
    // lesson UI cleanly omits the audio section. Idempotent.
    const cleaned = await knexInstance('lessons')
      .where('audio_url', 'like', '%audio.placeholder.com%')
      .update({ audio_url: null });
    if (cleaned > 0) {
      logger.info(`Cleared ${cleaned} placeholder audio URL(s)`);
    }
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
