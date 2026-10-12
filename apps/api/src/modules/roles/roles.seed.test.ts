import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defaultGrantsOf, isGrantable } from '@ab/shared';
import { describe, expect, it } from 'vitest';

// The migrations seed the system roles' grants by hand; this keeps them equal to the catalog
// (packages/shared defaultGrantsOf), which the parity test proves equal to the old @Roles table.
const MIGRATIONS = join(__dirname, '../../../../../packages/db/supabase/migrations');
const SQL = readFileSync(join(MIGRATIONS, '20261005000220_roles_permissions.sql'), 'utf8');
// Keys added later by an idempotent insert: select r.id, '<key>' from public.roles r where ... r.key in ('admin', 'teacher')
const LATER = [
  '20261005000240_student_recordings.sql',
  '20261006000274_assistant_scope_roles.sql',
  '20261006000281_student_logins.sql',
  '20261012000300_sales_messages_read.sql',
  '20261012000360_restricted_templates.sql',
  '20261012000380_notification_bell.sql',
]
  .map((file) => readFileSync(join(MIGRATIONS, file), 'utf8'))
  .join('\n');

function seeded(key: string): string[] {
  const block = SQL.match(new RegExp(`\\('${key}', array\\[([^\\]]*)\\]\\)`));
  return block?.[1] ? [...block[1].matchAll(/'([a-z_.]+)'/g)].map((m) => m[1] ?? '') : [];
}

function addedLater(key: string): string[] {
  const inserts = LATER.matchAll(/select r\.id, '([a-z_.]+)' from public\.roles r where [^;]*?r\.key in \(([^)]*)\)/g);
  return [...inserts].filter((m) => [...(m[2] ?? '').matchAll(/'([a-z_]+)'/g)].some((k) => k[1] === key)).map((m) => m[1] ?? '');
}

describe('migration 20261005000220 seed (+ 240, 274, 281, 300, 360, 380)', () => {
  it.each(['admin', 'teacher', 'assistant', 'sales'] as const)('%s gets exactly its catalog grants', (key) => {
    expect([...seeded(key), ...addedLater(key)].sort()).toEqual([...defaultGrantsOf(key)].sort());
  });

  it('seeds recordings.manage for the admin and the teacher only', () => {
    expect(['admin', 'teacher', 'assistant', 'sales'].filter((k) => addedLater(k).includes('recordings.manage'))).toEqual(['admin', 'teacher']);
  });

  it('seeds users.read and users.write for the admin only', () => {
    expect(['admin', 'teacher', 'assistant', 'sales'].filter((k) => addedLater(k).includes('users.write'))).toEqual(['admin']);
    expect(addedLater('admin')).toEqual(expect.arrayContaining(['users.read', 'users.write']));
  });

  it('seeds templates.send_all (every template, 2026-10-12) for the admin only', () => {
    expect(['admin', 'teacher', 'assistant', 'sales'].filter((k) => addedLater(k).includes('templates.send_all'))).toEqual(['admin']);
  });

  it('seeds notifications.push (the bell, 2026-10-12) for teacher, assistant and sales; the admin had it', () => {
    expect(['teacher', 'assistant', 'sales'].filter((k) => addedLater(k).includes('notifications.push'))).toEqual(['teacher', 'assistant', 'sales']);
    expect(seeded('admin')).toContain('notifications.push');
  });

  it('seeds nothing for guardians and only grantable keys', () => {
    expect(seeded('guardian')).toEqual([]);
    for (const key of ['admin', 'teacher', 'assistant', 'sales']) expect(seeded(key).every(isGrantable)).toBe(true);
  });
});
