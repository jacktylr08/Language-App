/**
 * A backup is only worth having if it round-trips and if a damaged one is
 * loudly rejected rather than quietly restored as garbage.
 */
import {
  BACKUP_FORMAT_VERSION,
  serialize,
  deserialize,
  isEncrypted,
  verify,
  type BackupFile,
} from '../../../scripts/lib/backup-format';

function sample(overrides: Partial<BackupFile> = {}): BackupFile {
  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    createdAt: '2026-07-26T00:00:00.000Z',
    schemaVersion: '011_state_versioning_and_history.ts',
    rowCounts: { users: 2, user_state: 1 },
    tables: {
      users: [
        { id: 'u1', email: 'a@example.com', password_hash: '$2a$10$hash' },
        { id: 'u2', email: 'b@example.com', password_hash: '$2a$10$hash2' },
      ],
      user_state: [{ user_id: 'u1', data: { progress: { streak: 9 } }, version: 4 }],
    },
    ...overrides,
  };
}

describe('round-tripping', () => {
  it('restores exactly what was backed up, unencrypted', () => {
    expect(deserialize(serialize(sample()))).toEqual(sample());
  });

  it('restores exactly what was backed up, encrypted', () => {
    const buf = serialize(sample(), 'correct horse battery staple');
    expect(deserialize(buf, 'correct horse battery staple')).toEqual(sample());
  });

  it('keeps nested JSONB (a learner’s whole progress blob) intact', () => {
    const restored = deserialize(serialize(sample(), 'key'), 'key');
    expect((restored.tables.user_state[0] as { data: { progress: { streak: number } } }).data.progress.streak).toBe(9);
  });
});

describe('encryption', () => {
  it('does not leave email addresses readable in the file', () => {
    const buf = serialize(sample(), 'key');
    expect(isEncrypted(buf)).toBe(true);
    expect(buf.toString('latin1')).not.toContain('a@example.com');
  });

  it('refuses to read an encrypted backup without the key', () => {
    expect(() => deserialize(serialize(sample(), 'key'))).toThrow(/encrypted/i);
  });

  it('refuses the wrong key rather than returning nonsense', () => {
    expect(() => deserialize(serialize(sample(), 'right'), 'wrong')).toThrow(/could not decrypt/i);
  });

  it('detects a truncated (half-uploaded) backup instead of restoring part of it', () => {
    const buf = serialize(sample(), 'key');
    expect(() => deserialize(buf.subarray(0, buf.length - 20), 'key')).toThrow(/could not decrypt/i);
  });

  it('still reads an older unencrypted backup when a key is configured', () => {
    // Turning encryption on must not strand the archive written before it.
    expect(deserialize(serialize(sample()), 'key')).toEqual(sample());
  });
});

describe('verify', () => {
  it('passes a consistent backup', () => {
    expect(verify(sample())).toEqual([]);
  });

  it('catches a table that lost rows between the count and the dump', () => {
    const bad = sample({ rowCounts: { users: 5, user_state: 1 } });
    expect(verify(bad)).toEqual([expect.stringContaining('users')]);
  });

  it('catches a table missing from the payload entirely', () => {
    const bad = sample();
    delete bad.tables.user_state;
    expect(verify(bad)).toEqual([expect.stringContaining('missing from the payload')]);
  });
});

describe('format version', () => {
  it('refuses a backup written by a future, incompatible version', () => {
    const future = serialize(sample({ formatVersion: 99 }));
    expect(() => deserialize(future)).toThrow(/not readable/i);
  });
});
