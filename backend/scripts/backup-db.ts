/**
 * Full logical backup of the learner database.
 *
 * The user_state_history table protects against a bad *write*. It does not
 * protect against a lost database, a dropped table, or a bad migration —
 * this does.
 *
 * Usage (from the backend/ directory):
 *   npx tsx scripts/backup-db.ts                  # write to ./backups
 *   npx tsx scripts/backup-db.ts --out /some/dir
 *   npx tsx scripts/backup-db.ts --stdout > db.json.gz.enc
 *
 * On Railway:
 *   railway run npx tsx scripts/backup-db.ts --stdout > fluenta-$(date +%F).json.gz.enc
 *
 * Environment:
 *   DATABASE_URL            required
 *   BACKUP_ENCRYPTION_KEY   strongly recommended — the dump contains every
 *                           learner's email address and password hash. Without
 *                           it the file is written in the clear and the script
 *                           warns loudly.
 *   BACKUP_DIR              default destination (default: ./backups)
 *   BACKUP_RETENTION_DAYS   prune local backups older than this (default: 30)
 */

import fs from 'fs';
import path from 'path';
import knex from 'knex';
import dotenv from 'dotenv';
import { BACKUP_FORMAT_VERSION, serialize, verify, type BackupFile } from './lib/backup-format';

dotenv.config();

/**
 * Parents before children, so a restore can insert in this order without
 * tripping a foreign key. Any table not listed is appended alphabetically —
 * a new table will still be backed up, it just may need reordering here
 * before a restore of that table succeeds.
 */
const TABLE_ORDER = [
  'knex_migrations',
  'users',
  'user_state',
  'user_state_history',
  'refresh_tokens',
  'push_subscriptions',
];

const NEVER_BACKUP = ['knex_migrations_lock'];

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}
const hasFlag = (name: string): boolean => process.argv.includes(`--${name}`);

/** Ordered list of the tables actually present in the database. */
async function listTables(db: knex.Knex): Promise<string[]> {
  const { rows } = await db.raw<{ rows: { table_name: string }[] }>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
  );
  const present = rows.map((r) => r.table_name).filter((t) => !NEVER_BACKUP.includes(t));
  const known = TABLE_ORDER.filter((t) => present.includes(t));
  const unknown = present.filter((t) => !TABLE_ORDER.includes(t)).sort();
  if (unknown.length) {
    console.warn(
      `⚠️  Tables not in TABLE_ORDER (backed up, but check restore ordering): ${unknown.join(', ')}`
    );
  }
  return [...known, ...unknown];
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set — refusing to guess which database to back up.');
    process.exit(1);
  }

  const passphrase = process.env.BACKUP_ENCRYPTION_KEY;
  const toStdout = hasFlag('stdout');
  const log = (msg: string): void => {
    // stdout carries the backup itself in --stdout mode; progress goes to stderr.
    if (toStdout) console.error(msg);
    else console.log(msg);
  };

  if (!passphrase) {
    log('⚠️  BACKUP_ENCRYPTION_KEY is not set. This backup will contain email');
    log('   addresses and password hashes IN THE CLEAR. Set the key before');
    log('   storing it anywhere but a disk you control.');
  }

  const db = knex({ client: 'pg', connection: process.env.DATABASE_URL, pool: { min: 1, max: 2 } });

  try {
    const tables = await listTables(db);
    const backup: BackupFile = {
      formatVersion: BACKUP_FORMAT_VERSION,
      createdAt: new Date().toISOString(),
      schemaVersion: null,
      rowCounts: {},
      tables: {},
    };

    // One repeatable-read transaction for the whole dump, so tables can't
    // drift relative to each other mid-backup (a user row without its
    // user_state row would restore as a learner with no progress).
    await db.transaction(async (trx) => {
      await trx.raw('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
      for (const table of tables) {
        const rows = await trx(table).select('*');
        backup.tables[table] = rows;
        backup.rowCounts[table] = rows.length;
        log(`   ${table}: ${rows.length} rows`);
      }
      const latest = await trx('knex_migrations').orderBy('id', 'desc').first();
      backup.schemaVersion = latest?.name ?? null;
    });

    const problems = verify(backup);
    if (problems.length) {
      console.error('❌ Backup failed self-verification:');
      problems.forEach((p) => console.error(`   - ${p}`));
      process.exit(1);
    }

    const payload = serialize(backup, passphrase);

    if (toStdout) {
      process.stdout.write(payload);
      log(`✅ ${payload.length} bytes written to stdout (schema: ${backup.schemaVersion}).`);
    } else {
      const dir = arg('out') || process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
      fs.mkdirSync(dir, { recursive: true });
      const stamp = backup.createdAt.replace(/[:.]/g, '-');
      const file = path.join(dir, `fluenta-${stamp}.json.gz${passphrase ? '.enc' : ''}`);
      fs.writeFileSync(file, payload);
      log(`✅ ${file} (${payload.length} bytes, schema: ${backup.schemaVersion})`);
      prune(dir, log);
    }
  } finally {
    await db.destroy();
  }
}

/** Deletes local backups older than BACKUP_RETENTION_DAYS. Never touches anything else. */
function prune(dir: string, log: (msg: string) => void): void {
  const days = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);
  if (!Number.isFinite(days) || days <= 0) return;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  const stale = fs
    .readdirSync(dir)
    .filter((f) => /^fluenta-.*\.json\.gz(\.enc)?$/.test(f))
    .filter((f) => fs.statSync(path.join(dir, f)).mtimeMs < cutoff);

  // Never prune down to nothing: if every file on disk is older than the
  // retention window, the newest one is all that stands between us and no
  // backup at all.
  const survivors = fs.readdirSync(dir).length - stale.length;
  if (survivors < 1) {
    stale.sort();
    stale.pop();
  }

  for (const f of stale) {
    fs.unlinkSync(path.join(dir, f));
    log(`   pruned ${f} (older than ${days} days)`);
  }
}

main().catch((err) => {
  console.error('❌ Backup failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
