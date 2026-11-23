import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR } from '@/common/db/repo-paths.test-util';

// The ticket → token map a receipt needs (an FCM DeviceNotRegistered receipt names no token). No
// database runs in unit tests: this pins the migration's shape; CI's e2e stack applies it.
const sql = readFileSync(join(MIGRATIONS_DIR, '20261122000100_push_ticket_tokens.sql'), 'utf8');
const code = sql
  .split('\n')
  .filter((l) => !l.trimStart().startsWith('--'))
  .join('\n');

describe('migration 20261122000100: push_notifications.ticket_tokens', () => {
  it('a jsonb map, never null, {} by default (old rows read as no map)', () => {
    expect(code).toMatch(
      /alter table public\.push_notifications\s+add column if not exists ticket_tokens jsonb not null default '\{\}'::jsonb;/,
    );
  });

  it('bounded lock wait, expand-only, RLS and grants untouched', () => {
    expect(code).toContain("set local lock_timeout = '5s';");
    expect(code).not.toMatch(/\bdrop\b/i);
    expect(code).not.toMatch(/\b(policy|grant|revoke|row level security)\b/i);
  });
});
