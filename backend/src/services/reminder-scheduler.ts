import { knexInstance } from '@/config/database';
import { pushConfigured, sendPushNotification } from './push-service';
import { logger } from '@/utils/logger';
import { errorMessage } from '@/utils/errors';

// Checking every 15 minutes is plenty for a once-a-day reminder — this isn't
// a precision scheduler, just enough resolution to catch the target hour.
const CHECK_INTERVAL_MS = 15 * 60 * 1000;
// UTC hour the reminder sweep fires at, once per day. No per-user timezone
// handling (there's no timezone stored anywhere in the app yet) — a single
// fixed hour is a reasonable default for a learner building this for
// themselves; override via REMINDER_HOUR_UTC if it lands awkwardly.
const REMINDER_HOUR_UTC = Number(process.env.REMINDER_HOUR_UTC ?? 18);

interface ReminderRow {
  user_id: string;
  streak: number;
  sub_id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
}

let lastSentDate: string | null = null;

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Finds every subscribed device belonging to a learner who is mid-streak but
 * hasn't practiced yet today (UTC), and sends each one a reminder. A user
 * with no subscriptions never shows up (inner join) — no notification setup,
 * no reminder. Dead subscriptions (410/404 from the push service) are
 * deleted as they're found rather than retried.
 */
async function sendStreakReminders(): Promise<void> {
  const today = todayUTC();

  const rows = (await knexInstance('user_state as us')
    .join('push_subscriptions as ps', 'ps.user_id', 'us.user_id')
    .whereRaw(`COALESCE((us.data->'progress'->>'streak')::int, 0) > 0`)
    .andWhereRaw(`(us.data->'progress'->>'lastActiveDay') IS DISTINCT FROM ?`, [today])
    .select(
      'us.user_id',
      knexInstance.raw(`(us.data->'progress'->>'streak')::int as streak`),
      'ps.id as sub_id',
      'ps.endpoint',
      'ps.p256dh',
      'ps.auth'
    )) as unknown as ReminderRow[];

  let sent = 0;
  for (const row of rows) {
    try {
      const { expired } = await sendPushNotification(
        { endpoint: row.endpoint, p256dh: row.p256dh, auth: row.auth },
        {
          title: "Don't lose your streak! 🔥",
          body: `You're on a ${row.streak}-day streak — a few minutes of Spanish keeps it alive.`,
          url: '/lessons',
        }
      );
      if (expired) {
        await knexInstance('push_subscriptions').where({ id: row.sub_id }).delete();
      } else {
        sent += 1;
      }
    } catch (err: unknown) {
      logger.error(`Reminder push failed for subscription ${row.sub_id}:`, errorMessage(err));
    }
  }

  if (rows.length) {
    logger.info(`Streak reminder sweep: sent ${sent}/${rows.length} push notification(s)`);
  }
}

/**
 * Starts an in-process daily check. No-op (just logs once) if push isn't
 * configured, mirroring the rest of the app's optional-integration pattern —
 * everything else works fine without VAPID keys set.
 */
export function startReminderScheduler(): void {
  if (!pushConfigured()) {
    logger.warn(
      'VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY not set — practice reminder notifications are disabled.'
    );
    return;
  }

  const tick = async () => {
    const now = new Date();
    const today = todayUTC();
    if (now.getUTCHours() >= REMINDER_HOUR_UTC && lastSentDate !== today) {
      lastSentDate = today;
      try {
        await sendStreakReminders();
      } catch (err: unknown) {
        logger.error('Reminder sweep failed:', errorMessage(err));
      }
    }
  };

  setInterval(() => void tick(), CHECK_INTERVAL_MS);
  logger.info(`Practice reminder scheduler started (fires once/day at ${REMINDER_HOUR_UTC}:00 UTC)`);
}
