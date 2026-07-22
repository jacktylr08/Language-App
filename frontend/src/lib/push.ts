/**
 * Practice reminder push notifications. The subscription itself (its
 * endpoint + keys) lives in the browser's PushManager and the backend's
 * push_subscriptions table — there's nothing to duplicate into localStorage
 * here; "are reminders on" is just "does this device have a live
 * subscription", checked directly from the browser API each time.
 */
import { api } from './api';

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** Null means "no subscription on this device" (permission never granted, or granted but not yet subscribed). */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

/**
 * Requests notification permission (if needed), subscribes this device, and
 * registers it with the backend. Throws with a readable message on any
 * failure (permission denied, push not configured server-side, etc) — the
 * caller decides how to surface that.
 */
export async function enablePushReminders(): Promise<void> {
  if (!pushSupported()) {
    throw new Error("This browser doesn't support push notifications.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted.');
  }

  const { data } = await api.get('/push/public-key');
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlToUint8Array(data.publicKey) as BufferSource,
  });

  await api.post('/push/subscribe', { subscription: subscription.toJSON() });
}

export async function disablePushReminders(): Promise<void> {
  const subscription = await getExistingSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await api.post('/push/unsubscribe', { endpoint }).catch(() => {
    /* device-side unsubscribe already succeeded; a stale server row is harmless */
  });
}
