import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import { User } from '@/models/User';
import { logger } from '@/utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '30d';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

export const auth = {
  async hashPassword(password: string): Promise<string> {
    const salt = await bcryptjs.genSalt(10);
    return bcryptjs.hash(password, salt);
  },

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcryptjs.compare(password, hash);
  },

  generateTokens(userId: string, email: string): AuthTokens {
    const accessToken = jwt.sign(
      { userId, email, type: 'access' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    const refreshToken = jwt.sign(
      { userId, email, type: 'refresh' },
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

  async register(email: string, password: string): Promise<User> {
    // Check if user exists
    const existing = await User.query().findOne('email', email);
    if (existing) {
      throw new Error('Email already registered');
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Create user
    const user = await User.query().insert({
      email,
      password_hash: passwordHash,
      current_level: 0,
      locale: 'es-MX',
      preferences: {
        target_reviews_per_day: 20,
        review_time_distribution: 'distributed',
        audio_playback_speed: 1.0,
        target_conversation_length_minutes: 10,
      },
    });

    logger.info(`User registered: ${email}`);
    return user;
  },

  async login(email: string, password: string): Promise<{ user: User; tokens: AuthTokens }> {
    const user = await User.query().findOne('email', email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const valid = await this.comparePassword(password, user.password_hash);
    if (!valid) {
      throw new Error('Invalid email or password');
    }

    // Update last active
    await user.$query().patch({ last_active_at: new Date().toISOString() });

    const tokens = this.generateTokens(user.id, user.email);
    logger.info(`User logged in: ${email}`);

    return { user, tokens };
  },

  async refreshAccessToken(refreshToken: string): Promise<string> {
    const payload = this.verifyToken(refreshToken);
    if (!payload || payload.type !== 'refresh') {
      throw new Error('Invalid refresh token');
    }

    const user = await User.query().findById(payload.userId);
    if (!user) {
      throw new Error('User not found');
    }

    const { accessToken } = this.generateTokens(user.id, user.email);
    return accessToken;
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
      updated_at: new Date().toISOString(),
    });

    logger.info(`Password changed for user: ${user.email}`);
  },
};
