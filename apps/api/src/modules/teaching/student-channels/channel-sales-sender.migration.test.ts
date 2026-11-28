import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CHANNEL_SENDER_ROLES } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR } from '@/common/db/repo-paths.test-util';

// The seated assistant writes too: read as text, no database in unit tests.
const strip = (sql: string) =>
  sql
    .split('\n')
    .filter((l) => !l.trim().startsWith('--'))
    .join('\n');
const file = '20261116000200_channel_sales_sender.sql';
const sql = strip(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'));
const NAME = 'channel_messages_sender_role_check';

/** The quoted words between `sender_role in (` and its `)`. */
const checkRoles = (): string[] => {
  const start = sql.indexOf('sender_role in (') + 'sender_role in ('.length;
  const list = sql.slice(start, sql.indexOf(')', start));
  return list.split(',').map((r) => r.trim().slice(1, -1));
};

describe('migration 20261116000200: the assistant writes in the student chat', () => {
  it('drops the old check by its real name if it exists, then adds it back', () => {
    const drop = `alter table public.channel_messages drop constraint if exists ${NAME};`;
    expect(sql).toContain(drop);
    expect(sql.indexOf(drop)).toBeLessThan(sql.indexOf(`add constraint ${NAME}`));
  });

  it('the roles are the shared contract: the three before and sales', () => {
    expect(checkRoles()).toEqual([...CHANNEL_SENDER_ROLES]);
    expect(CHANNEL_SENDER_ROLES).toContain('sales');
  });

  it('writes no row and keeps the lock short', () => {
    expect(sql).toContain("set local lock_timeout = '5s';");
    expect(sql).not.toMatch(/\b(insert into|update public|delete from)\b/i);
  });
});
