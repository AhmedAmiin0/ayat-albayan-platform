import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Migration 20261030000982 read as text (no database in unit tests; CI's e2e job applies it).

const sql = readFileSync(join(__dirname, '../../../../../../../../packages/db/supabase/migrations/20261030000982_message_pdf_preview.sql'), 'utf8');
const code = sql.replace(/--.*$/gm, '');

describe('migration 20261030000982 message PDF preview', () => {
  it('adds media_pages and media_bytes, nullable, never negative, idempotently', () => {
    expect(code).toMatch(/add column if not exists media_pages integer check \(media_pages is null or media_pages >= 0\)/);
    expect(code).toMatch(/add column if not exists media_bytes integer check \(media_bytes is null or media_bytes >= 0\)/);
    expect(code).toMatch(/set local lock_timeout/);
  });

  it('expand-only: no drop, no default, no not null, no bucket, policy or grant', () => {
    expect(code).not.toMatch(/\bdrop\b|not null|default|storage\.buckets|create policy|grant /i);
    expect(sql).toMatch(/MANUAL ROLLBACK/);
  });
});
