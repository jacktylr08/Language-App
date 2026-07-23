jest.mock('@/models/User', () => ({
  User: { query: jest.fn() },
}));

import { Response } from 'express';
import { verifyToken, AuthRequest } from '@/middleware/auth';
import { auth } from '@/services/auth';
import { User } from '@/models/User';

function mockRes(): Response {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as Response;
}

function mockReq(authHeader?: string): AuthRequest {
  return { headers: { authorization: authHeader } } as unknown as AuthRequest;
}

/** Wires up User.query().findById(...).where(...) to resolve to `user`. */
function mockFoundUser(user: unknown): void {
  const where = jest.fn().mockResolvedValue(user);
  const findById = jest.fn().mockReturnValue({ where });
  (User.query as jest.Mock).mockReturnValue({ findById });
}

describe('verifyToken middleware', () => {
  const userId = 'user-1';
  const email = 'learner@example.com';

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('rejects a request with no authorization header', async () => {
    const req = mockReq(undefined);
    const res = mockRes();
    const next = jest.fn();

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a malformed/invalid token', async () => {
    const req = mockReq('Bearer not-a-real-token');
    const res = mockRes();
    const next = jest.fn();

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts a valid token whose tokenVersion matches the current DB value', async () => {
    const { accessToken } = auth.generateTokens(userId, email, 2);
    mockFoundUser({ id: userId, email, token_version: 2, deleted_at: null });

    const req = mockReq(`Bearer ${accessToken}`);
    const res = mockRes();
    const next = jest.fn();

    await verifyToken(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.userId).toBe(userId);
    expect(req.email).toBe(email);
  });

  it('rejects a token whose tokenVersion is stale (e.g. password changed since issuance)', async () => {
    const { accessToken } = auth.generateTokens(userId, email, 0);
    // Password change since bumped the user's version to 1 — the old token
    // (tokenVersion: 0) must no longer work even though it hasn't expired.
    mockFoundUser({ id: userId, email, token_version: 1, deleted_at: null });

    const req = mockReq(`Bearer ${accessToken}`);
    const res = mockRes();
    const next = jest.fn();

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a token for a user that no longer exists (deleted/not found)', async () => {
    const { accessToken } = auth.generateTokens(userId, email, 0);
    mockFoundUser(undefined);

    const req = mockReq(`Bearer ${accessToken}`);
    const res = mockRes();
    const next = jest.fn();

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a refresh token presented as an access token', async () => {
    const { refreshToken } = auth.generateTokens(userId, email, 0);

    const req = mockReq(`Bearer ${refreshToken}`);
    const res = mockRes();
    const next = jest.fn();

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('answers 500 if the DB lookup itself fails', async () => {
    const { accessToken } = auth.generateTokens(userId, email, 0);
    const where = jest.fn().mockRejectedValue(new Error('connection lost'));
    const findById = jest.fn().mockReturnValue({ where });
    (User.query as jest.Mock).mockReturnValue({ findById });

    const req = mockReq(`Bearer ${accessToken}`);
    const res = mockRes();
    const next = jest.fn();

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();
  });
});
