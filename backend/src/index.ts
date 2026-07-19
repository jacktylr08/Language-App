import express, { Express, Request, Response } from 'express';
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
  try {
    // Initialize Redis
    await initRedis();
    logger.info('Redis connected');

    // Test database connection
    await knexInstance.raw('SELECT 1');
    logger.info('Database connected');

    // Start Express server
    app.listen(port, () => {
      logger.info(`Server running on http://localhost:${port}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();

export default app;
