import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RESTRICTED_TEMPLATE_DEFAULTS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR } from '@/common/db/repo-paths.test-util';

// Owner 2026-11-14 («a template that carries your text»). No database runs in unit tests: this
// pins the migration's shape.
const sql = readFileSync(join(MIGRATIONS_DIR, '20261114000200_academy_message_allowed.sql'), 'utf8');
const code = sql.replace(/--[^\n]*/g, '');

describe('migration 20261114000200: academy_message on the allow-list', () => {
  it('is one of the restricted defaults the chat import flags', () => {
    expect(RESTRICTED_TEMPLATE_DEFAULTS).toContain('academy_message');
  });

  it('flags only an existing chat-line row not yet flagged (idempotent)', () => {
    expect(code).toMatch(
      /update public\.message_templates\s+set sales_starter = true\s+where key = 'academy_message'\s+and line = 'chat'\s+and not sales_starter;/,
    );
  });

  it('inserts nothing and touches no other row or status', () => {
    expect(code).not.toMatch(/insert|delete|status/i);
  });
});
