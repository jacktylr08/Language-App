import { Router, Response } from 'express';
import Joi from 'joi';
import { auth } from '@/services/auth';
import { verifyToken, AuthRequest } from '@/middleware/auth';
import { loginLimiter, registerLimiter } from '@/middleware/rate-limit';
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

// Register
router.post('/register', registerLimiter, async (req, res: Response): Promise<void> => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      res.status(400).json({ error: error.details[0].message });
      return;
    }

    const user = await auth.register(value.email, value.password);
    const tokens = auth.generateTokens(user.id, user.email);

    res.status(201).json({
      user: { id: user.id, email: user.email, current_level: user.current_level },
      tokens,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    logger.error('Registration error:', message);
    res.status(400).json({ error: message });
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
    logger.error('Login error:', message);
    res.status(401).json({ error: message });
  }
});

// Refresh token
router.post('/refresh', async (req, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ error: 'Missing refresh token' });
      return;
    }

    const accessToken = await auth.refreshAccessToken(refreshToken);
    res.json({ accessToken });
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

// Logout (client-side only, but endpoint for symmetry)
router.post('/logout', verifyToken, (_req: AuthRequest, res: Response): void => {
  res.json({ success: true });
});

export default router;
