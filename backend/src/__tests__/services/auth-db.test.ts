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

/**
 * Mocks the case-insensitive lookup chain used by findByEmail:
 *   User.query().whereRaw(...).whereNull(...).first()   — or  .whereRaw(...).first()
 * Returns the spies so a test can assert on the SQL actually issued.
 */
function mockEmailLookup(result: unknown, extras: Record<string, unknown> = {}) {
  const first = jest.fn().mockResolvedValue(result);
  const whereNull = jest.fn().mockReturnValue({ first });
  const whereRaw = jest.fn().mockReturnValue({ whereNull, first });
  (User.query as jest.Mock).mockReturnValue({ whereRaw, ...extras });
  return { whereRaw, whereNull, first };
}

describe('email lookups are case-insensitive', () => {
  it('register() stores the lowercased address and checks existence case-insensitively', async () => {
    const insert = jest
      .fn()
      .mockImplementation((row: Record<string, unknown>) => Promise.resolve({ ...fakeUser(), ...row }));
    const { whereRaw } = mockEmailLookup(undefined, { insert });

    const user = await auth.register('Mixed.Case@Example.com', 'password123');

    expect(whereRaw).toHaveBeenCalledWith('LOWER(email) = ?', ['mixed.case@example.com']);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ email: 'mixed.case@example.com' }));
    expect(user.email).toBe('mixed.case@example.com');
  });

  it('login() matches on LOWER(email) rather than an exact comparison', async () => {
    // comparePassword will fail against the 'irrelevant' hash — we only care
    // that the lookup itself was case-insensitive.
    const { whereRaw } = mockEmailLookup(fakeUser({ email: 'someone@example.com' }));

    await expect(auth.login('Someone@EXAMPLE.com', 'whatever')).rejects.toThrow();
    expect(whereRaw).toHaveBeenCalledWith('LOWER(email) = ?', ['someone@example.com']);
  });

  it('regression: finds an account whose stored email predates normalization', async () => {
    // The real incident: rows written before lowercasing existed kept their
    // original casing, and an exact-match lookup made them invisible at
    // login — indistinguishable from the account having been deleted.
    const legacy = fakeUser({ email: 'Jack.Taylor@Gmail.com' });
    const { first } = mockEmailLookup(legacy);

    await expect(auth.login('jack.taylor@gmail.com', 'whatever')).rejects.toThrow(
      /invalid email or password/i // reached the password check, i.e. the row WAS found
    );
    expect(first).toHaveBeenCalled();
  });
});

describe('register() enumeration-safe error tagging', () => {
  it('tags a duplicate-email failure with code "email_taken" (route turns this into a generic message)', async () => {
    mockEmailLookup(fakeUser());

    await expect(auth.register('taken@example.com', 'password123')).rejects.toMatchObject({
      code: 'email_taken',
    });
  });

  it('regression: refuses to create a duplicate when the existing row differs only by case', async () => {
    // Without this, a learner locked out by the casing bug who hit "register"
    // silently got a second, empty account instead of an error.
    mockEmailLookup(fakeUser({ email: 'Jack.Taylor@Gmail.com' }));

    await expect(auth.register('jack.taylor@gmail.com', 'password123')).rejects.toMatchObject({
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

  it('regression: two refresh tokens issued in the same second are still distinct', async () => {
    // The refresh payload is otherwise fully determined by
    // userId/email/type/tokenVersion plus a one-second-resolution iat/exp, so
    // without a unique jti two issuances inside the same second are
    // byte-identical — and the second insert violates the token_hash unique
    // constraint. That broke "register then log straight in", logging in
    // twice quickly, and two tabs refreshing at once.
    const a = auth.generateTokens('user-1', 'user@example.com', 0);
    const b = auth.generateTokens('user-1', 'user@example.com', 0);

    expect(a.refreshToken).not.toBe(b.refreshToken);
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
