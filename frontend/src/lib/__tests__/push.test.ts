import { pushSupported, enablePushReminders, disablePushReminders, getExistingSubscription } from '../push';

describe('push', () => {
  it('reports unsupported in an environment with no PushManager/serviceWorker (like this test env)', () => {
    // jsdom doesn't implement the Push API — this should detect that cleanly
    // rather than throwing when the account page checks it on mount.
    expect(pushSupported()).toBe(false);
  });

  it('getExistingSubscription resolves to null rather than throwing when unsupported', async () => {
    await expect(getExistingSubscription()).resolves.toBeNull();
  });

  it('enablePushReminders throws a readable error instead of a raw API exception when unsupported', async () => {
    await expect(enablePushReminders()).rejects.toThrow(/support/i);
  });

  it('disablePushReminders is a safe no-op when there is nothing subscribed', async () => {
    await expect(disablePushReminders()).resolves.toBeUndefined();
  });
});
