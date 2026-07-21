/**
 * Admin password-reset script.
 *
 * Runs against whatever database DATABASE_URL points at (on Railway that's
 * production), so it can rescue an account that is fully locked out — no
 * existing session or old password required.
 *
 * Usage (from the backend/ directory):
 *   npx tsx scripts/reset-password.ts <email> <newPassword>
 *
 * or via env vars (handy in CI / Railway "run" panels):
 *   RESET_EMAIL=you@example.com RESET_PASSWORD=secret npx tsx scripts/reset-password.ts
 *
 * It hashes the new password with bcrypt exactly the way the auth service
 * does, updates the matching (non-deleted) user, and exits.
 */

import knex from 'knex';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function main(): Promise<void> {
  const email = (process.argv[2] || process.env.RESET_EMAIL || '').trim().toLowerCase();
  const newPassword = process.argv[3] || process.env.RESET_PASSWORD || '';

  if (!email || !newPassword) {
    console.error(
      'Usage: npx tsx scripts/reset-password.ts <email> <newPassword>\n' +
        '   or: RESET_EMAIL=... RESET_PASSWORD=... npx tsx scripts/reset-password.ts'
    );
    process.exit(1);
  }

  if (newPassword.length < 8) {
    console.error('❌ New password must be at least 8 characters.');
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error(
      '❌ DATABASE_URL is not set. Run this where the database is reachable ' +
        '(e.g. on Railway: `railway run npx tsx scripts/reset-password.ts <email> <password>`).'
    );
    process.exit(1);
  }

  const db = knex({
    client: 'pg',
    connection: process.env.DATABASE_URL,
    pool: { min: 1, max: 2 },
  });

  try {
    // Case-insensitive email match, skip soft-deleted accounts.
    const user = await db('users')
      .whereRaw('LOWER(email) = ?', [email])
      .whereNull('deleted_at')
      .first();

    if (!user) {
      console.error(`❌ No active account found for "${email}".`);
      // Help the operator see what's actually in there.
      const all = await db('users').whereNull('deleted_at').select('email').limit(25);
      if (all.length) {
        console.error('   Known accounts:');
        for (const u of all) console.error(`     • ${u.email}`);
      } else {
        console.error('   The users table has no active accounts.');
      }
      process.exit(1);
    }

    const passwordHash = await bcryptjs.hash(newPassword, 10);
    await db('users')
      .where({ id: user.id })
      .update({ password_hash: passwordHash, updated_at: new Date().toISOString() });

    console.log(`✅ Password reset for ${user.email}.`);
    console.log('   You can now sign in with the new password.');
  } catch (err) {
    console.error('❌ Reset failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}

main();
