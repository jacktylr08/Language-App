import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import { User } from '@/models/User';
import { knexInstance } from '@/config/database';
import { logger } from '@/utils/logger';

const FALLBACK_JWT_SECRET = 'dev-secret-key-change-in-production';

// That fallback string is sitting in source control, so it must never be the
// real secret in production — anyone who's read the repo could otherwise
// forge a token for any account. Refuse to boot rather than run insecurely.
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === FALLBACK_JWT_SECRET)) {
  throw new Error(
    'JWT_SECRET must be set to a real secret in production (it is currently unset or equal to the public dev fallback).'
  );
}

const JWT_SECRET = process.env.JWT_SECRET || FALLBACK_JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '30d';

// Fallback lifetime used only if a freshly-signed refresh JWT's `exp` claim
// can't be read back out (should never happen) — keeps the DB record's
// expiry roughly in step with the token's actual expiry either way.
const DEFAULT_REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
  tokenVersion: number;
}

/**
 * Emails are matched case-insensitively everywhere (registration, login, the
 * admin reset-password script) by normalizing to lowercase at the one point
 * they enter the system — otherwise "User@x.com" and "user@x.com" would
 * silently become two different accounts.
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Never log a raw email address — mask everything but a short prefix. */
function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return '***';
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(local.length - visible.length, 1))}@${domain}`;
}

function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const auth = {
  async hashPassword(password: string): Promise<string> {
    const salt = await bcryptjs.genSalt(10);
    return bcryptjs.hash(password, salt);
  },

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcryptjs.compare(password, hash);
  },

  generateTokens(userId: string, email: string, tokenVersion = 0): AuthTokens {
    const accessToken = jwt.sign(
      { userId, email, type: 'access', tokenVersion },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    const refreshToken = jwt.sign(
      { userId, email, type: 'refresh', tokenVersion },
      JWT_SECRET,
      { expiresIn: JWT_REFRESH_EXPIRY }
    );

    return { accessToken, refreshToken };
  },

  verifyToken(token: string): TokenPayload | null {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
      return payload;
    } catch (error) {
      logger.debug('Token verification failed:', error);
      return null;
    }
  },

  /**
   * Signs a fresh access+refresh pair and records the refresh token (hashed)
   * in `refresh_tokens` so it can later be looked up, rotated, or revoked.
   * The single path used by register/login/refresh so every issued refresh
   * token is always tracked.
   */
  async issueTokens(userId: string, email: string, tokenVersion: number): Promise<AuthTokens> {
    const tokens = this.generateTokens(userId, email, tokenVersion);

    const decoded = jwt.decode(tokens.refreshToken) as { exp?: number } | null;
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + DEFAULT_REFRESH_TTL_MS);

    await knexInstance('refresh_tokens').insert({
      user_id: userId,
      token_hash: hashRefreshToken(tokens.refreshToken),
      expires_at: expiresAt.toISOString(),
    });

    return tokens;
  },

  async register(email: string, password: string): Promise<User> {
    const normalizedEmail = normalizeEmail(email);

    // Check if user exists
    const existing = await User.query().findOne('email', normalizedEmail);
    if (existing) {
      // Tagged so the route can respond with a generic message — surfacing
      // "email already registered" as a distinct error from every other
      // failure lets an attacker enumerate which addresses have accounts.
      const err = new Error('Email already registered');
      (err as Error & { code?: string }).code = 'email_taken';
      throw err;
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Create user
    const user = await User.query().insert({
      email: normalizedEmail,
      password_hash: passwordHash,
      current_level: 0,
      locale: 'es-MX',
      token_version: 0,
      preferences: {
        target_reviews_per_day: 20,
        review_time_distribution: 'distributed',
        audio_playback_speed: 1.0,
        target_conversation_length_minutes: 10,
      },
    });

    logger.info(`User registered: ${maskEmail(user.email)}`);
    return user;
  },

  async login(email: string, password: string): Promise<{ user: User; tokens: AuthTokens }> {
    const normalizedEmail = normalizeEmail(email);
    const user = await User.query().findOne('email', normalizedEmail);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const valid = await this.comparePassword(password, user.password_hash);
    if (!valid) {
      throw new Error('Invalid email or password');
    }

    // Update last active
    await user.$query().patch({ last_active_at: new Date().toISOString() });

    const tokens = await this.issueTokens(user.id, user.email, user.token_version ?? 0);
    logger.info(`User logged in: ${maskEmail(user.email)}`);

    return { user, tokens };
  },

  /**
   * Refresh token rotation: the incoming refresh token must be a valid,
   * unexpired, unrevoked JWT with a live DB record and a token_version that
   * still matches the user's current one. On success the old record is
   * revoked and a brand-new access+refresh pair (with a new DB record) is
   * issued — reusing the old refresh token afterwards fails.
   */
  async rotateRefreshToken(refreshToken: string): Promise<{ user: User; tokens: AuthTokens }> {
    const payload = this.verifyToken(refreshToken);
    if (!payload || payload.type !== 'refresh') {
      throw new Error('Invalid refresh token');
    }

    const tokenHash = hashRefreshToken(refreshToken);
    const record = await knexInstance('refresh_tokens').where({ token_hash: tokenHash }).first();

    if (!record || record.revoked_at || new Date(record.expires_at).getTime() < Date.now()) {
      throw new Error('Refresh token has been revoked or expired');
    }

    const user = await User.query().findById(payload.userId).where('deleted_at', null);
    if (!user || (user.token_version ?? 0) !== payload.tokenVersion) {
      throw new Error('Invalid refresh token');
    }

    // Rotate: kill the used token before minting the replacement so a
    // concurrent replay of the same old token can't also succeed.
    await knexInstance('refresh_tokens')
      .where({ id: record.id })
      .update({ revoked_at: new Date().toISOString() });

    const tokens = await this.issueTokens(user.id, user.email, user.token_version ?? 0);
    return { user, tokens };
  },

  /** Revokes a specific refresh token's DB record (used by /logout). Safe to call with an already-revoked or unknown token — always a no-op success. */
  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const tokenHash = hashRefreshToken(refreshToken);
    await knexInstance('refresh_tokens')
      .where({ token_hash: tokenHash })
      .whereNull('revoked_at')
      .update({ revoked_at: new Date().toISOString() });
  },

  async getUserById(userId: string): Promise<User | undefined> {
    return User.query().findById(userId).where('deleted_at', null);
  },

  /**
   * Change a user's password.
   *
   * The caller is already authenticated (a valid JWT reached this endpoint),
   * which is itself proof of session ownership — so `currentPassword` is
   * optional. When supplied it is verified for extra safety; when omitted
   * (the "I forgot my password but I'm still logged in" case) the valid
   * session authorizes the reset. Auth here is Bearer-token based, not
   * cookie based, so this is not exposed to CSRF.
   */
  async changePassword(
    userId: string,
    newPassword: string,
    currentPassword?: string
  ): Promise<void> {
    const user = await User.query().findById(userId).where('deleted_at', null);
    if (!user) {
      throw new Error('User not found');
    }

    if (currentPassword) {
      const valid = await this.comparePassword(currentPassword, user.password_hash);
      if (!valid) {
        throw new Error('Current password is incorrect');
      }
    }

    // Reject reusing the same password
    const sameAsOld = await this.comparePassword(newPassword, user.password_hash);
    if (sameAsOld) {
      throw new Error('New password must be different from your current password');
    }

    const passwordHash = await this.hashPassword(newPassword);
    await user.$query().patch({
      password_hash: passwordHash,
      // Bumping token_version invalidates every access/refresh token issued
      // before this point — a stolen token stops working the instant the
      // password changes, instead of surviving until it naturally expires.
      token_version: (user.token_version ?? 0) + 1,
      updated_at: new Date().toISOString(),
    });

    logger.info(`Password changed for user: ${maskEmail(user.email)}`);
  },
};
