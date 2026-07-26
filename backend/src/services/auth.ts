import jwt, { type SignOptions } from 'jsonwebtoken';
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
/**
 * Typed as SignOptions['expiresIn'] rather than string. jsonwebtoken's types
 * accept a `StringValue` template literal ("7d", "30m", …) or a number, not
 * an arbitrary string, so a plain `string` fails every jwt.sign overload —
 * which is why `tsc --noEmit` had never been clean here. The env var is
 * genuinely a string, so the assertion is the honest way to say "this is a
 * duration and the caller is responsible for it being well-formed".
 */
const JWT_EXPIRY = (process.env.JWT_EXPIRY || '7d') as SignOptions['expiresIn'];
const JWT_REFRESH_EXPIRY = (process.env.JWT_REFRESH_EXPIRY || '30d') as SignOptions['expiresIn'];

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
 * admin reset-password script) — otherwise "User@x.com" and "user@x.com"
 * would silently become two different accounts.
 *
 * New rows are stored already-lowercased, but LOOKUPS must never assume that:
 * accounts created before normalization existed still hold their original
 * casing. Matching a lowercased input with a case-sensitive `=` made every
 * one of those rows invisible to login — the account looked deleted, and
 * registering again produced an empty duplicate. Always compare with
 * findByEmail below, never with a bare equality on the column.
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Case-insensitive lookup that works regardless of how the row was stored.
 * `includeDeleted` is for the registration uniqueness check, which must see
 * soft-deleted rows too so their address isn't silently re-registered.
 */
function findByEmail(email: string, { includeDeleted = false } = {}) {
  const q = User.query().whereRaw('LOWER(email) = ?', [normalizeEmail(email)]);
  return includeDeleted ? q.first() : q.whereNull('deleted_at').first();
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

    // `jti` makes every refresh token unique even when two are issued in the
    // same second. Without it the payload is fully determined by
    // userId/email/type/tokenVersion plus a one-second-resolution iat/exp, so
    // two issuances inside the same second produce byte-identical tokens —
    // and the second insert into refresh_tokens fails the token_hash unique
    // constraint. In practice that broke registering and then immediately
    // logging in, logging in twice quickly, and two tabs refreshing at once,
    // all of which surface to the learner as "login is broken".
    const refreshToken = jwt.sign(
      { userId, email, type: 'refresh', tokenVersion, jti: crypto.randomUUID() },
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

    // Case-insensitive, and deliberately includes soft-deleted rows — a
    // case-sensitive check here is what let a locked-out learner create an
    // empty duplicate of an account that already existed.
    const existing = await findByEmail(email, { includeDeleted: true });
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
    const user = await findByEmail(email);
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

  /**
   * Permanently deletes a learner's account. Requires the current password —
   * unlike changePassword, a valid session alone isn't enough authorization
   * for something this irreversible.
   *
   * Soft-deletes the users row (deleted_at, matching this codebase's existing
   * "where deleted_at is null" convention already used everywhere a user is
   * looked up) and anonymizes the email/password hash so the address is
   * freed up for a future registration and no usable credential survives —
   * a flag alone would leave a real password hash and email sitting there
   * forever, which isn't really "deleting" anything. Also bumps
   * token_version and revokes every refresh token so every session dies
   * immediately, and hard-deletes the actual learner data (progress blob,
   * push subscriptions) rather than leaving it attached to a "deleted" row.
   */
  async deleteAccount(userId: string, password: string): Promise<void> {
    const user = await User.query().findById(userId).where('deleted_at', null);
    if (!user) {
      throw new Error('User not found');
    }

    const valid = await this.comparePassword(password, user.password_hash);
    if (!valid) {
      throw new Error('Incorrect password');
    }

    const anonymizedEmail = `deleted-${user.id}@deleted.fluenta.invalid`;
    const now = new Date().toISOString();

    await user.$query().patch({
      deleted_at: now,
      email: anonymizedEmail,
      password_hash: crypto.randomUUID(),
      token_version: (user.token_version ?? 0) + 1,
      updated_at: now,
    });
    await knexInstance('refresh_tokens').where({ user_id: userId }).whereNull('revoked_at').update({ revoked_at: now });
    await knexInstance('user_state').where({ user_id: userId }).delete();
    await knexInstance('push_subscriptions').where({ user_id: userId }).delete();

    logger.info(`Account deleted: user ${userId}`);
  },
};
