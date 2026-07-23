// Auth service behavior that touches the DB (register/login/changePassword,
// and the refresh-token rotation/revocation table) — split from
// auth.test.ts, which covers the pure JWT/hashing logic without any mocks.

jest.mock('@/models/User', () => ({
  User: { query: jest.fn() },
}));

jest.mock('@/config/database', () => {
  const builder = {
    insert: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    whereNull: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockResolvedValue(undefined),
    first: jest.fn(),
  };
  return { knexInstance: jest.fn(() => builder), __builder: builder };
});

import { auth } from '@/services/auth';
import { User } from '@/models/User';
const { __builder: refreshTokenBuilder } = jest.requireMock('@/config/database') as {
  __builder: {
    insert: jest.Mock;
    where: jest.Mock;
    whereNull: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    first: jest.Mock;
  };
};

function fakeUser(overrides: Record<string, unknown> = {}) {
  const patch = jest.fn().mockResolvedValue(undefined);
  return {
    id: 'user-1',
    email: 'user@example.com',
    password_hash: 'irrelevant',
    token_version: 0,
    deleted_at: null,
    $query: jest.fn().mockReturnValue({ patch }),
    __patch: patch,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('email normalization (case-insensitivity)', () => {
  it('register() lowercases the email before checking existence and storing it', async () => {
    const findOne = jest.fn().mockResolvedValue(undefined);
    const insert = jest.fn().mockImplementation((row: Record<string, unknown>) => Promise.resolve({ ...fakeUser(), ...row }));
    (User.query as jest.Mock).mockReturnValue({ findOne, insert });

    const user = await auth.register('Mixed.Case@Example.com', 'password123');

    expect(findOne).toHaveBeenCalledWith('email', 'mixed.case@example.com');
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ email: 'mixed.case@example.com' }));
    expect(user.email).toBe('mixed.case@example.com');
  });

  it('login() looks up the lowercased email regardless of the casing supplied', async () => {
    const user = fakeUser({ email: 'someone@example.com' });
    // comparePassword will fail against 'irrelevant' hash — that's fine, we
    // only care that the lookup itself was normalized.
    const findOne = jest.fn().mockResolvedValue(user);
    (User.query as jest.Mock).mockReturnValue({ findOne });

    await expect(auth.login('Someone@EXAMPLE.com', 'whatever')).rejects.toThrow();
    expect(findOne).toHaveBeenCalledWith('email', 'someone@example.com');
  });
});

describe('register() enumeration-safe error tagging', () => {
  it('tags a duplicate-email failure with code "email_taken" (route turns this into a generic message)', async () => {
    const findOne = jest.fn().mockResolvedValue(fakeUser());
    (User.query as jest.Mock).mockReturnValue({ findOne });

    await expect(auth.register('taken@example.com', 'password123')).rejects.toMatchObject({
      code: 'email_taken',
    });
  });
});

describe('changePassword() bumps token_version', () => {
  it('increments token_version on a successful password change', async () => {
    const user = fakeUser({ token_version: 3 });
    const findById = jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue(user) });
    (User.query as jest.Mock).mockReturnValue({ findById });

    // comparePassword against 'irrelevant' hash will be false for any real
    // bcrypt compare, so skip currentPassword verification by omitting it
    // (allowed — see the auth.ts docblock) and stub comparePassword to avoid
    // relying on a real bcrypt hash in the fixture.
    jest.spyOn(auth, 'comparePassword').mockResolvedValue(false);

    await auth.changePassword('user-1', 'brand-new-password');

    expect(user.__patch).toHaveBeenCalledWith(
      expect.objectContaining({ token_version: 4 })
    );
  });
});

describe('refresh token rotation', () => {
  it('rotateRefreshToken issues a new pair and revokes the old DB record', async () => {
    const user = fakeUser({ token_version: 0 });
    const { refreshToken } = auth.generateTokens(user.id, user.email, 0);

    const findById = jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue(user) });
    (User.query as jest.Mock).mockReturnValue({ findById });

    refreshTokenBuilder.first.mockResolvedValueOnce({
      id: 'rt-1',
      revoked_at: null,
      expires_at: new Date(Date.now() + 10_000).toISOString(),
    });

    const { tokens } = await auth.rotateRefreshToken(refreshToken);

    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();
    // The old record was revoked, and a new one inserted for the new token
    // (a fresh DB row every time means the old token_hash can never be
    // "un-revoked" by reissuing the same JWT).
    expect(refreshTokenBuilder.where).toHaveBeenCalledWith({ id: 'rt-1' });
    expect(refreshTokenBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ revoked_at: expect.any(String) })
    );
    expect(refreshTokenBuilder.insert).toHaveBeenCalled();
  });

  it('rejects a refresh token with no matching DB record', async () => {
    const { refreshToken } = auth.generateTokens('user-1', 'user@example.com', 0);
    refreshTokenBuilder.first.mockResolvedValueOnce(undefined);

    await expect(auth.rotateRefreshToken(refreshToken)).rejects.toThrow(/revoked or expired/i);
  });

  it('rejects a refresh token whose DB record is already revoked (no reuse)', async () => {
    const { refreshToken } = auth.generateTokens('user-1', 'user@example.com', 0);
    refreshTokenBuilder.first.mockResolvedValueOnce({
      id: 'rt-1',
      revoked_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 10_000).toISOString(),
    });

    await expect(auth.rotateRefreshToken(refreshToken)).rejects.toThrow(/revoked or expired/i);
  });

  it('rejects a refresh token whose DB record has expired', async () => {
    const { refreshToken } = auth.generateTokens('user-1', 'user@example.com', 0);
    refreshTokenBuilder.first.mockResolvedValueOnce({
      id: 'rt-1',
      revoked_at: null,
      expires_at: new Date(Date.now() - 10_000).toISOString(),
    });

    await expect(auth.rotateRefreshToken(refreshToken)).rejects.toThrow(/revoked or expired/i);
  });

  it('rejects a refresh token whose tokenVersion no longer matches the user (e.g. password changed)', async () => {
    const user = fakeUser({ token_version: 5 });
    const { refreshToken } = auth.generateTokens(user.id, user.email, 0);

    const findById = jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue(user) });
    (User.query as jest.Mock).mockReturnValue({ findById });

    refreshTokenBuilder.first.mockResolvedValueOnce({
      id: 'rt-1',
      revoked_at: null,
      expires_at: new Date(Date.now() + 10_000).toISOString(),
    });

    await expect(auth.rotateRefreshToken(refreshToken)).rejects.toThrow(/invalid refresh token/i);
  });

  it('revokeRefreshToken marks the matching, not-yet-revoked record as revoked', async () => {
    await auth.revokeRefreshToken('some-refresh-token');

    expect(refreshTokenBuilder.where).toHaveBeenCalledWith(
      expect.objectContaining({ token_hash: expect.any(String) })
    );
    expect(refreshTokenBuilder.whereNull).toHaveBeenCalledWith('revoked_at');
    expect(refreshTokenBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ revoked_at: expect.any(String) })
    );
  });
});

describe('deleteAccount()', () => {
  it('rejects with the wrong password without touching any data', async () => {
    const user = fakeUser({ token_version: 2 });
    const findById = jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue(user) });
    (User.query as jest.Mock).mockReturnValue({ findById });
    jest.spyOn(auth, 'comparePassword').mockResolvedValue(false);

    await expect(auth.deleteAccount('user-1', 'wrong-password')).rejects.toThrow(/incorrect password/i);
    expect(user.__patch).not.toHaveBeenCalled();
  });

  it('anonymizes the email, invalidates the password hash, bumps token_version, and deletes learner data on a correct password', async () => {
    const user = fakeUser({ id: 'user-1', email: 'someone@example.com', token_version: 2 });
    const findById = jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue(user) });
    (User.query as jest.Mock).mockReturnValue({ findById });
    jest.spyOn(auth, 'comparePassword').mockResolvedValue(true);

    await auth.deleteAccount('user-1', 'correct-password');

    expect(user.__patch).toHaveBeenCalledWith(
      expect.objectContaining({
        deleted_at: expect.any(String),
        email: 'deleted-user-1@deleted.fluenta.invalid',
        token_version: 3,
      })
    );
    // Password hash is replaced with something that isn't the original —
    // the exact value doesn't matter, only that no usable credential survives.
    const patchArg = user.__patch.mock.calls[0][0];
    expect(patchArg.password_hash).not.toBe(user.password_hash);

    expect(refreshTokenBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ revoked_at: expect.any(String) })
    );
    expect(refreshTokenBuilder.delete).toHaveBeenCalledTimes(2); // user_state + push_subscriptions
  });

  it('rejects for an already-deleted (or unknown) user', async () => {
    const findById = jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) });
    (User.query as jest.Mock).mockReturnValue({ findById });

    await expect(auth.deleteAccount('ghost-user', 'anything')).rejects.toThrow(/not found/i);
  });
});
