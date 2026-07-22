import { auth } from '@/services/auth';

describe('Authentication Service', () => {
  describe('Password Hashing', () => {
    it('should hash a password', async () => {
      const password = 'test-password-123';
      const hash = await auth.hashPassword(password);
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should compare passwords correctly', async () => {
      const password = 'test-password-123';
      const hash = await auth.hashPassword(password);
      const match = await auth.comparePassword(password, hash);
      expect(match).toBe(true);
    });

    it('should reject wrong password', async () => {
      const password = 'test-password-123';
      const hash = await auth.hashPassword(password);
      const match = await auth.comparePassword('wrong-password', hash);
      expect(match).toBe(false);
    });
  });

  describe('Token Generation', () => {
    it('should generate access and refresh tokens', () => {
      const userId = 'test-user-id';
      const email = 'test@example.com';
      const tokens = auth.generateTokens(userId, email);

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.accessToken).not.toBe(tokens.refreshToken);
    });
  });

  describe('Token Verification', () => {
    it('should verify valid token', () => {
      const userId = 'test-user-id';
      const email = 'test@example.com';
      const tokens = auth.generateTokens(userId, email);

      const payload = auth.verifyToken(tokens.accessToken);
      expect(payload).toBeDefined();
      expect(payload?.userId).toBe(userId);
      expect(payload?.email).toBe(email);
      expect(payload?.type).toBe('access');
    });

    it('should reject invalid token', () => {
      const payload = auth.verifyToken('invalid-token');
      expect(payload).toBeNull();
    });

    it('should reject expired token', async () => {
      // Create a token with very short expiry for testing
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId: 'test', email: 'test@example.com', type: 'access' },
        process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
        { expiresIn: '0s' }
      );

      // Wait a bit to ensure expiry — awaited so the assertion below actually
      // runs before Jest considers the test complete (a bare setTimeout with
      // no done callback previously let this test "pass" without ever
      // checking anything).
      await new Promise((resolve) => setTimeout(resolve, 100));
      const payload = auth.verifyToken(expiredToken);
      expect(payload).toBeNull();
    });
  });
});
