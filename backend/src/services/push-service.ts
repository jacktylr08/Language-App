import webpush from 'web-push';

/**
 * Web Push (practice reminders). Needs a VAPID key pair — generate one with
 * `npx web-push generate-vapid-keys` and set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
 * and VAPID_SUBJECT (a mailto: address or contact URL, required by the push
 * protocol so a push service can reach you about a misbehaving sender).
 *
 * Same optional-config shape as the OpenAI tutor: if the keys aren't set, we
 * throw a tagged error so routes can answer 503 instead of crashing — the
 * rest of the app works fine without reminders configured.
 */
export function pushConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

let configured = false;
function ensureConfigured(): void {
  if (configured) return;
  if (!pushConfigured()) {
    const err = new Error(
      'Push notifications are not configured (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not set). ' +
        'Generate a key pair with `npx web-push generate-vapid-keys` and set them in your environment to enable it.'
    );
    (err as any).code = 'push_not_configured';
    throw err;
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:support@example.com',
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configured = true;
}

export function getVapidPublicKey(): string {
  ensureConfigured();
  return process.env.VAPID_PUBLIC_KEY!;
}

export interface PushSubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Sends one push notification. Returns `{ expired: true }` (instead of
 * throwing) when the push service reports the subscription is gone (410) or
 * unknown (404) — the caller should delete that row rather than treat it as
 * a transient failure, since retrying a dead endpoint will never succeed.
 */
export async function sendPushNotification(
  sub: PushSubscriptionRow,
  payload: { title: string; body: string; url?: string }
): Promise<{ expired: boolean }> {
  ensureConfigured();
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload)
    );
    return { expired: false };
  } catch (err: any) {
    if (err?.statusCode === 404 || err?.statusCode === 410) {
      return { expired: true };
    }
    throw err;
  }
}
