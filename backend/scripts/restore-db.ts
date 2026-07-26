/**
 * Restore from a backup written by backup-db.ts.
 *
 * Read-only by default. It prints what it *would* do and changes nothing
 * until you pass --apply — the same shape as recover-account.ts, because a
 * restore run against the wrong DATABASE_URL is exactly as destructive as
 * the data loss it's meant to fix.
 *
 * Usage (from the backend/ directory):
 *   npx tsx scripts/restore-db.ts <file>                   # inspect + verify only
 *   npx tsx scripts/restore-db.ts <file> --apply           # restore everything
 *   npx tsx scripts/restore-db.ts <file> --user a@b.com    # inspect one learner
 *   npx tsx scripts/restore-db.ts <file> --user a@b.com --apply
 *
 * Environment:
 *   DATABASE_URL            required for --apply (and for the diff preview)
 *   BACKUP_ENCRYPTION_KEY   required if the backup is encrypted
 *
 * Rows are upserted on the primary key, so a restore is idempotent and
 * running it twice is harmless. It only ever ADDS rows back — it never
 * deletes a row that exists now and isn't in the backup.
 */

import fs from 'fs';
import knex from 'knex';
import dotenv from 'dotenv';
import { deserialize, verify, type BackupFile } from './lib/backup-format';

dotenv.config();

/** Tables keyed by something other than "id". */
const PRIMARY_KEYS: Record<string, string> = { user_state: 'user_id' };

/** Tables with a serial id whose sequence must be moved past the restored rows. */
const SERIAL_TABLES = ['user_state_history', 'knex_migrations'];

const hasFlag = (name: string): boolean => process.argv.includes(`--${name}`);
function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

/** Narrows a backup down to a single learner and everything that hangs off them. */
function scopeToUser(backup: BackupFile, email: string): BackupFile {
  const wanted = email.trim().toLowerCase();
  const users = (backup.tables.users as { id: string; email: string }[] | undefined) ?? [];
  const matches = users.filter((u) => (u.email || '').toLowerCase() === wanted);
  const ids = new Set(matches.map((u) => u.id));

  const scoped: BackupFile = { ...backup, tables: {}, rowCounts: {} };
  scoped.tables.users = matches;
  for (const table of ['user_state', 'user_state_history', 'push_subscriptions']) {
    const rows = (backup.tables[table] as { user_id: string }[] | undefined) ?? [];
    scoped.tables[table] = rows.filter((r) => ids.has(r.user_id));
  }
  // Deliberately NOT refresh_tokens: restoring old sessions would resurrect
  // credentials the learner may have signed out of since.
  for (const [t, rows] of Object.entries(scoped.tables)) scoped.rowCounts[t] = rows.length;
  return scoped;
}

async function main(): Promise<void> {
  const file = process.argv[2];
  if (!file || file.startsWith('--')) {
    console.error('Usage: npx tsx scripts/restore-db.ts <backup-file> [--user <email>] [--apply]');
    process.exit(1);
  }

  const backupFull = deserialize(fs.readFileSync(file), process.env.BACKUP_ENCRYPTION_KEY);
  const problems = verify(backupFull);
  console.log(`Backup:   ${file}`);
  console.log(`Taken:    ${backupFull.createdAt}`);
  console.log(`Schema:   ${backupFull.schemaVersion}`);
  if (problems.length) {
    console.error('❌ This backup does not verify against its own manifest:');
    problems.forEach((p) => console.error(`   - ${p}`));
    process.exit(1);
  }
  console.log('Integrity: ✅ contents match the manifest\n');

  const userFilter = arg('user');
  const backup = userFilter ? scopeToUser(backupFull, userFilter) : backupFull;
  if (userFilter && backup.tables.users.length === 0) {
    console.error(`❌ No account for "${userFilter}" in this backup.`);
    process.exit(1);
  }

  const apply = hasFlag('apply');
  console.log(apply ? 'Mode:     APPLY (writing)\n' : 'Mode:     DRY RUN (nothing will be written)\n');

  if (!process.env.DATABASE_URL) {
    console.log('DATABASE_URL is not set, so this is a file inspection only:');
    for (const [t, n] of Object.entries(backup.rowCounts)) console.log(`   ${t}: ${n} rows`);
    return;
  }

  const db = knex({ client: 'pg', connection: process.env.DATABASE_URL, pool: { min: 1, max: 2 } });

  try {
    for (const [table, rows] of Object.entries(backup.tables)) {
      if (!rows.length) continue;
      const live = await db(table).count<{ count: string }[]>('* as count').first();
      console.log(`   ${table}: ${rows.length} rows in backup, ${live?.count ?? '?'} live now`);
    }

    if (!apply) {
      console.log('\nRe-run with --apply to write these rows back (existing rows are updated, none are deleted).');
      return;
    }

    await db.transaction(async (trx) => {
      for (const [table, rows] of Object.entries(backup.tables)) {
        if (!rows.length) continue;
        const key = PRIMARY_KEYS[table] || 'id';
        // Chunked: a single insert of thousands of rows blows past Postgres's
        // bind-parameter limit.
        for (let i = 0; i < rows.length; i += 200) {
          await trx(table).insert(rows.slice(i, i + 200)).onConflict(key).merge();
        }
        console.log(`   restored ${rows.length} rows into ${table}`);
      }

      // Restored rows carry their original ids, so the sequence is now behind
      // them — the next insert would collide without this.
      for (const table of SERIAL_TABLES) {
        if (!backup.tables[table]?.length) continue;
        await trx.raw(
          `SELECT setval(pg_get_serial_sequence(?, 'id'), COALESCE((SELECT MAX(id) FROM ??), 1))`,
          [table, table]
        );
      }
    });

    console.log('\n✅ Restore complete.');
  } finally {
    await db.destroy();
  }
}

main().catch((err) => {
  console.error('❌ Restore failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
