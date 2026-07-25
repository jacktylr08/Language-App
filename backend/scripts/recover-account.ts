/**
 * Account recovery / diagnosis.
 *
 * Built for this failure: registration and login started lowercasing emails
 * with no migration for rows already stored with different casing, and the
 * lookup was a case-sensitive `=`. Any account whose stored address had an
 * uppercase character stopped being findable at login. From the learner's
 * side that is indistinguishable from deletion — and registering again
 * created a second, empty account under the lowercase address.
 *
 * This finds every account for an address (any casing, including
 * soft-deleted), shows how much learning data each one holds, and can move
 * the synced state from an abandoned duplicate back onto the account the
 * learner actually uses.
 *
 * READ-ONLY by default. Nothing is written without --apply.
 *
 * Usage (from backend/, against the real database):
 *   railway run npx tsx scripts/recover-account.ts you@example.com
 *   railway run npx tsx scripts/recover-account.ts you@example.com --apply
 */

import knex from 'knex';
import dotenv from 'dotenv';

dotenv.config();

interface UserRow {
  id: string;
  email: string;
  created_at: string | null;
  last_active_at: string | null;
  deleted_at: string | null;
}

interface StateSummary {
  lessonsCompleted: number;
  wordsTracked: number;
  streak: number;
  bestStreak: number;
  tutorSessions: number;
  updatedAt: string | null;
  raw: unknown;
}

function summarize(stateRow: { data: unknown; updated_at: string } | undefined): StateSummary {
  const data = (stateRow?.data ?? {}) as {
    progress?: {
      lessons?: Record<string, { completed?: boolean; skipped?: boolean }>;
      words?: Record<string, unknown>;
      streak?: number;
      bestStreak?: number;
    };
    tutorProfile?: { history?: unknown[] } | null;
  };
  const lessons = data.progress?.lessons ?? {};
  return {
    lessonsCompleted: Object.values(lessons).filter((l) => l?.completed || l?.skipped).length,
    wordsTracked: Object.keys(data.progress?.words ?? {}).length,
    streak: data.progress?.streak ?? 0,
    bestStreak: data.progress?.bestStreak ?? 0,
    tutorSessions: data.tutorProfile?.history?.length ?? 0,
    updatedAt: stateRow?.updated_at ?? null,
    raw: stateRow?.data ?? null,
  };
}

/** How much a given account is "worth" — used only to suggest, never to act unasked. */
function weight(s: StateSummary): number {
  return s.lessonsCompleted * 1000 + s.wordsTracked + s.tutorSessions * 10;
}

async function main(): Promise<void> {
  const email = (process.argv[2] || process.env.RECOVER_EMAIL || '').trim().toLowerCase();
  const apply = process.argv.includes('--apply');

  if (!email) {
    console.error('Usage: npx tsx scripts/recover-account.ts <email> [--apply]');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error(
      '❌ DATABASE_URL is not set. Run where the database is reachable, e.g.\n' +
        '   railway run npx tsx scripts/recover-account.ts <email>'
    );
    process.exit(1);
  }

  const db = knex({ client: 'pg', connection: process.env.DATABASE_URL, pool: { min: 1, max: 2 } });

  try {
    const users: UserRow[] = await db('users')
      .select('id', 'email', 'created_at', 'last_active_at', 'deleted_at')
      .whereRaw('LOWER(email) = ?', [email])
      .orderBy('created_at', 'asc');

    if (users.length === 0) {
      console.log(`\nNo account found for ${email} (checked every casing, including deleted).`);
      return;
    }

    console.log(`\nFound ${users.length} account(s) for ${email}:\n`);

    const enriched = [];
    for (const u of users) {
      const stateRow = await db('user_state').where({ user_id: u.id }).first();
      const summary = summarize(stateRow);
      enriched.push({ user: u, summary });

      console.log(`  id            ${u.id}`);
      console.log(`  email         ${u.email}${u.email !== u.email.toLowerCase() ? '   ← mixed case' : ''}`);
      console.log(`  created       ${u.created_at ?? '?'}`);
      console.log(`  last active   ${u.last_active_at ?? 'never'}`);
      if (u.deleted_at) console.log(`  DELETED AT    ${u.deleted_at}`);
      console.log(
        `  progress      ${summary.lessonsCompleted} lessons · ${summary.wordsTracked} words · ` +
          `streak ${summary.streak} (best ${summary.bestStreak}) · ${summary.tutorSessions} tutor sessions`
      );
      console.log(`  state saved   ${summary.updatedAt ?? 'never'}`);
      console.log('');
    }

    const withData = enriched.filter((e) => weight(e.summary) > 0);
    const richest = [...enriched].sort((a, b) => weight(b.summary) - weight(a.summary))[0];

    if (users.length === 1) {
      const only = enriched[0];
      console.log(
        weight(only.summary) > 0
          ? '✅ Single account, and its learning data is intact on the server.\n' +
              '   If the app is showing it as empty, the data is fine — the client just is not\n' +
              '   pulling it. Sign out and back in to force a fresh sync.'
          : '⚠️  Single account, but the server has no learning data for it.\n' +
              '   If progress existed on a device, it is still in that browser localStorage and\n' +
              '   will re-sync on next load. Do NOT sign out on that device before it syncs.'
      );
      if (only.user.email !== only.user.email.toLowerCase()) {
        console.log(
          `\n   Its stored email is mixed-case (${only.user.email}). Login is now\n` +
            '   case-insensitive so this works either way, but --apply will normalize it.'
        );
        if (apply) {
          await db('users').where({ id: only.user.id }).update({ email: only.user.email.toLowerCase() });
          console.log('   ✅ Email normalized to lowercase.');
        }
      }
      return;
    }

    // Multiple accounts for one address — the duplicate-registration case.
    console.log('⚠️  More than one account exists for this address — the classic symptom of');
    console.log('   being locked out by the casing bug and re-registering.\n');
    console.log(`   Richest account: ${richest.user.id} (${richest.user.email})`);
    console.log(
      `   holds ${richest.summary.lessonsCompleted} lessons / ${richest.summary.wordsTracked} words.\n`
    );

    if (withData.length > 1) {
      console.log('   ❗ More than one account has real data. Not touching anything automatically —');
      console.log('      merging is a judgement call. Inspect the ids above and decide.');
      return;
    }

    // Exactly one account holds the data. The learner can currently log into
    // whichever row owns the lowercase address, so make that the one with data.
    const canonical = enriched.find((e) => e.user.email === email && !e.user.deleted_at);
    if (!canonical) {
      console.log('   No non-deleted account owns the lowercase address; login now matches any');
      console.log('   casing, so the richest account above should already work. Nothing to do.');
      return;
    }
    if (canonical.user.id === richest.user.id) {
      console.log('   ✅ The account holding the data is already the one you log into. Nothing to do.');
      return;
    }

    console.log(`   Plan: move the saved state from ${richest.user.id}`);
    console.log(`         onto ${canonical.user.id} (the one you can log into),`);
    console.log('         and retire the now-empty duplicate.\n');

    if (!apply) {
      console.log('   Dry run — nothing written. Re-run with --apply to do it.');
      return;
    }

    await db.transaction(async (trx) => {
      const source = await trx('user_state').where({ user_id: richest.user.id }).first();
      if (!source) throw new Error('Source state vanished mid-run — aborted, nothing changed.');

      // Keep a copy on the source row too; this is a copy, never a move, so a
      // mistake here can always be undone from the original account.
      await trx('user_state')
        .insert({ user_id: canonical.user.id, data: source.data, updated_at: new Date().toISOString() })
        .onConflict('user_id')
        .merge(['data', 'updated_at']);

      // Free the address up and take the emptied duplicate out of the way.
      await trx('users')
        .where({ id: richest.user.id })
        .update({ email: `recovered-${richest.user.id}@recovered.invalid` });
    });

    console.log('   ✅ Done. Sign out and back in on your device to pull the restored state.');
    console.log(`   The original account (${richest.user.id}) still holds its own copy — nothing deleted.`);
  } finally {
    await db.destroy();
  }
}

main().catch((err) => {
  console.error('❌ Failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
