jest.mock('@/config/database', () => ({
  knexInstance: { raw: jest.fn() },
}));

jest.mock('@/config/redis', () => ({
  redisClient: { isOpen: false },
}));

import { getHealthStatus } from '@/services/health-service';
import { knexInstance } from '@/config/database';
import { redisClient } from '@/config/redis';

describe('getHealthStatus', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('reports ok/200-worthy status when the DB responds', async () => {
    (knexInstance.raw as jest.Mock).mockResolvedValue({ rows: [{ '?column?': 1 }] });
    (redisClient as { isOpen: boolean }).isOpen = true;

    const health = await getHealthStatus();

    expect(health.status).toBe('ok');
    expect(health.db).toBe('ok');
    expect(health.redis).toBe('ok');
    expect(health.timestamp).toEqual(expect.any(String));
  });

  it('reports degraded status when the DB query rejects', async () => {
    (knexInstance.raw as jest.Mock).mockRejectedValue(new Error('connection refused'));
    (redisClient as { isOpen: boolean }).isOpen = true;

    const health = await getHealthStatus();

    expect(health.status).toBe('degraded');
    expect(health.db).toBe('unreachable');
  });

  it('reports Redis as unavailable without flipping overall status to degraded', async () => {
    (knexInstance.raw as jest.Mock).mockResolvedValue({ rows: [] });
    (redisClient as { isOpen: boolean }).isOpen = false;

    const health = await getHealthStatus();

    expect(health.status).toBe('ok');
    expect(health.redis).toBe('unavailable');
  });

  it('treats a slow/hanging DB query as unreachable rather than waiting forever', async () => {
    (knexInstance.raw as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // never resolves
    );
    (redisClient as { isOpen: boolean }).isOpen = true;

    const health = await getHealthStatus();

    expect(health.status).toBe('degraded');
    expect(health.db).toBe('unreachable');
  }, 10000);
});
