import { Router, Response } from 'express';
import Joi from 'joi';
import { auth } from '@/services/auth';
import { verifyToken, AuthRequest } from '@/middleware/auth';
import { loginLimiter, registerLimiter, refreshLimiter } from '@/middleware/rate-limit';
import { logger } from '@/utils/logger';

const router = Router();

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().allow('').optional(),
  newPassword: Joi.string().min(8).required(),
});

const deleteAccountSchema = Joi.object({
  password: Joi.string().required(),
});

// Register
router.post('/register', registerLimiter, async (req, res: Response): Promise<void> => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      res.status(400).json({ error: error.details[0].message });
      return;
    }

    const user = await auth.register(value.email, value.password);
    const tokens = await auth.issueTokens(user.id, user.email, user.token_version ?? 0);

    res.status(201).json({
      user: { id: user.id, email: user.email, current_level: user.current_level },
      tokens,
    });
  } catch (err) {
    logger.error('Registration error:', err);
    // "Email already registered" is deliberately not surfaced as-is — doing
    // so would let an attacker enumerate which addresses already have
    // accounts. Every registration failure (other than input validation,
    // handled above) gets the same generic message, matching how /login
    // already answers "Invalid email or password" for every failure mode.
    res.status(400).json({ error: 'Could not create account' });
  }
});

// Login
router.post('/login', loginLimiter, async (req, res: Response): Promise<void> => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      res.status(400).json({ error: error.details[0].message });
      return;
    }

    const { user, tokens } = await auth.login(value.email, value.password);
    res.json({
      user: { id: user.id, email: user.email, current_level: user.current_level },
      tokens,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Login failed';
    logger.error('Login error:', err);
    res.status(401).json({ error: message });
  }
});

// Refresh token — rotates the refresh token on every use (the old one is
// revoked server-side, so replaying it afterwards fails). Returns a brand
// new access+refresh pair; callers must persist the new refreshToken.
router.post('/refresh', refreshLimiter, async (req, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken || typeof refreshToken !== 'string') {
      res.status(400).json({ error: 'Missing refresh token' });
      return;
    }

    const { tokens } = await auth.rotateRefreshToken(refreshToken);
    // accessToken kept at top level for backward compatibility with existing
    // clients; refreshToken is new — clients must start persisting it, since
    // the old refresh token is now revoked and will not work again.
    res.json({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token refresh failed';
    logger.error('Token refresh error:', message);
    res.status(401).json({ error: message });
  }
});

// Get current user
router.get('/me', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await auth.getUserById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      current_level: user.current_level,
      locale: user.locale,
      preferences: user.preferences,
      created_at: user.created_at,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get user';
    logger.error('Get user error:', message);
    res.status(500).json({ error: message });
  }
});

// Change password (requires auth; current password optional)
router.post('/change-password', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { error, value } = changePasswordSchema.validate(req.body);
    if (error) {
      res.status(400).json({ error: error.details[0].message });
      return;
    }

    await auth.changePassword(
      req.userId!,
      value.newPassword,
      value.currentPassword || undefined
    );

    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to change password';
    logger.error('Change password error:', message);
    // "incorrect" / "different" are user errors → 400
    const status = /incorrect|different|not found/i.test(message) ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

// Logout: revokes the refresh token's DB record so it can no longer be used
// at /refresh, even though the (still technically valid) access token keeps
// working until it naturally expires. Body: { refreshToken? }. Always
// answers success — an unknown/missing/already-revoked token is not an error,
// the end state ("this refresh token doesn't work") is the same either way.
router.post('/logout', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body ?? {};
    if (typeof refreshToken === 'string' && refreshToken) {
      await auth.revokeRefreshToken(refreshToken);
    }
    res.json({ success: true });
  } catch (err) {
    logger.error('Logout error:', err);
    // Logout should never appear to fail to the client — worst case the
    // refresh token just outlives the session slightly longer than intended.
    res.json({ success: true });
  }
});

// Delete account: permanent, requires the current password as a second
// confirmation beyond just holding a valid session (unlike change-password,
// where a valid session alone is enough). Body: { password }.
router.delete('/account', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { error, value } = deleteAccountSchema.validate(req.body);
    if (error) {
      res.status(400).json({ error: error.details[0].message });
      return;
    }

    await auth.deleteAccount(req.userId!, value.password);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete account';
    logger.error('Delete account error:', err);
    const status = /incorrect|not found/i.test(message) ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

export default router;
