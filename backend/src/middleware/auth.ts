import { Request, Response, NextFunction } from 'express';
import { auth } from '@/services/auth';
import { User } from '@/models/User';
import { logger } from '@/utils/logger';

export interface AuthRequest extends Request {
  userId?: string;
  email?: string;
}

/**
 * Verifies the bearer JWT is well-formed and unexpired, then checks its
 * embedded `tokenVersion` against the user's current value in the DB — this
 * is what actually makes token revocation work: bumping token_version (e.g.
 * on password change) instantly invalidates every token issued before the
 * bump, even though the JWT itself would otherwise still verify. That DB
 * lookup is why this middleware is async, a deliberate tradeoff of one extra
 * query per authenticated request in exchange for real revocation.
 */
export const verifyToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  const payload = auth.verifyToken(token);

  if (!payload || payload.type !== 'access') {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  try {
    const user = await User.query().findById(payload.userId).where('deleted_at', null);
    if (!user || (user.token_version ?? 0) !== payload.tokenVersion) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
  } catch (err) {
    logger.error('Auth token_version lookup failed:', err);
    res.status(500).json({ error: 'Internal server error' });
    return;
  }

  req.userId = payload.userId;
  req.email = payload.email;
  next();
};

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
};
