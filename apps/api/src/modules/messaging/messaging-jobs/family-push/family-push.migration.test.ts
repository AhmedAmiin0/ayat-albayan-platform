import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FAMILY_PUSH_KINDS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR } from '@/common/db/repo-paths.test-util';

// Migrations 300 and 310 (docs/50 §5 item 6). No database runs in unit tests: this pins them.
const code = (file: string) =>
  readFileSync(join(MIGRATIONS_DIR, file), 'utf8')
    .split('\n')
    .filter((l) => !l.trimStart().startsWith('--'))
    .join('\n');

describe('migration 300: the family push kinds', () => {
  const sql = code('20261114000300_family_push_kinds.sql');

  it('adds each family kind re-runnably, and nothing else', () => {
    for (const kind of FAMILY_PUSH_KINDS)
      expect(sql).toContain(`alter type public.push_kind add value if not exists '${kind}';`);
    expect(sql.trim().split('\n')).toHaveLength(FAMILY_PUSH_KINDS.length);
  });

  it('grants nothing in the DB: the portal roles keep no role_permissions rows (433)', () => {
    expect(sql).not.toMatch(/role_permissions|grant /i);
  });
});

describe('migration 310: the sweep’s index on sent reports', () => {
  it('a partial, re-runnable index on lesson_reports.sent_at', () => {
    const sql = code('20261114000310_report_sent_idx.sql');
    expect(sql).toContain('create index if not exists lesson_reports_sent_at_idx');
    expect(sql).toContain('on public.lesson_reports (sent_at)');
    expect(sql).toContain('where sent_at is not null;');
  });
});
