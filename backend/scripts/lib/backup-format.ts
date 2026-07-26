/**
 * The on-disk format shared by backup-db.ts and restore-db.ts.
 *
 * A backup is a single self-describing file:
 *
 *   [ gzip( JSON ) ]                      when unencrypted   (.json.gz)
 *   [ magic | salt | iv | tag | body ]    when encrypted     (.json.gz.enc)
 *
 * Logical JSON rather than pg_dump output, deliberately: it restores with
 * nothing but node and a connection string (Railway's runtime has no
 * postgres-client), it is diffable, and a human can read a single learner's
 * row out of it without standing up a database.
 */

import crypto from 'crypto';
import zlib from 'zlib';

/** Bumped only if the envelope shape changes incompatibly. */
export const BACKUP_FORMAT_VERSION = 1;

export interface BackupFile {
  formatVersion: number;
  /** ISO timestamp of when the dump started. */
  createdAt: string;
  /** Latest applied knex migration, so a restore can spot a schema mismatch. */
  schemaVersion: string | null;
  /** Row count per table, checked against the payload on restore. */
  rowCounts: Record<string, number>;
  tables: Record<string, unknown[]>;
}

const MAGIC = Buffer.from('FLUENTABK1');
const SALT_BYTES = 16;
const IV_BYTES = 12;
const TAG_BYTES = 16;

/**
 * Derives the AES key from the passphrase. scrypt (not a bare hash) so a
 * weak BACKUP_ENCRYPTION_KEY still costs something to brute-force offline —
 * the backup contains every learner's email and password hash.
 */
function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return crypto.scryptSync(passphrase, salt, 32);
}

export function serialize(backup: BackupFile, passphrase?: string): Buffer {
  const gz = zlib.gzipSync(Buffer.from(JSON.stringify(backup)), { level: 9 });
  if (!passphrase) return gz;

  const salt = crypto.randomBytes(SALT_BYTES);
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(passphrase, salt), iv);
  const body = Buffer.concat([cipher.update(gz), cipher.final()]);
  return Buffer.concat([MAGIC, salt, iv, cipher.getAuthTag(), body]);
}

export function isEncrypted(buf: Buffer): boolean {
  return buf.length > MAGIC.length && buf.subarray(0, MAGIC.length).equals(MAGIC);
}

export function deserialize(buf: Buffer, passphrase?: string): BackupFile {
  let gz = buf;

  if (isEncrypted(buf)) {
    if (!passphrase) {
      throw new Error('This backup is encrypted — set BACKUP_ENCRYPTION_KEY to read it.');
    }
    let offset = MAGIC.length;
    const salt = buf.subarray(offset, (offset += SALT_BYTES));
    const iv = buf.subarray(offset, (offset += IV_BYTES));
    const tag = buf.subarray(offset, (offset += TAG_BYTES));
    const decipher = crypto.createDecipheriv('aes-256-gcm', deriveKey(passphrase, salt), iv);
    decipher.setAuthTag(tag);
    try {
      // GCM: final() throws if the ciphertext was truncated or tampered with,
      // which is exactly the "half-uploaded backup" case we want to catch
      // BEFORE anyone tries to restore from it.
      gz = Buffer.concat([decipher.update(buf.subarray(offset)), decipher.final()]);
    } catch {
      throw new Error('Could not decrypt backup — wrong BACKUP_ENCRYPTION_KEY, or the file is corrupt.');
    }
  } else if (passphrase) {
    // Not fatal: an older unencrypted backup is still perfectly restorable.
    // Say so rather than silently reading it, so nobody assumes their
    // archive is encrypted when part of it isn't.
    console.warn('⚠️  This backup is NOT encrypted (written before encryption was enabled).');
  }

  const parsed = JSON.parse(zlib.gunzipSync(gz).toString()) as BackupFile;
  if (parsed.formatVersion !== BACKUP_FORMAT_VERSION) {
    throw new Error(
      `Backup format version ${parsed.formatVersion} is not readable by this script (expected ${BACKUP_FORMAT_VERSION}).`
    );
  }
  return parsed;
}

/** Verifies the payload against its own manifest. Returns the problems found. */
export function verify(backup: BackupFile): string[] {
  const problems: string[] = [];
  for (const [table, expected] of Object.entries(backup.rowCounts)) {
    const actual = backup.tables[table]?.length;
    if (actual === undefined) problems.push(`table "${table}" is listed in the manifest but missing from the payload`);
    else if (actual !== expected) problems.push(`table "${table}": manifest says ${expected} rows, payload has ${actual}`);
  }
  for (const table of Object.keys(backup.tables)) {
    if (!(table in backup.rowCounts)) problems.push(`table "${table}" is in the payload but not the manifest`);
  }
  return problems;
}
