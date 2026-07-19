import { createClient } from 'redis';
import dotenv from 'dotenv';
import { logger } from '@/utils/logger';

dotenv.config();

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  database: parseInt(process.env.REDIS_DB || '0'),
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        return new Error('Redis unreachable — giving up after 10 attempts');
      }
      return Math.min(retries * 500, 3000);
    },
  },
});

redisClient.on('error', (err) => logger.error('Redis error:', err));
redisClient.on('connect', () => logger.info('Redis connected'));

export const initRedis = async (): Promise<void> => {
  await redisClient.connect();
};

export { redisClient };
