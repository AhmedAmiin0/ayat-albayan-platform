import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { migrationPath } from '@/common/db/repo-paths.test-util';
import { templateProblem } from '@/modules/messaging/whatsapp/template-review';

// Migrations 20261105000300 / 301, read as text: no database here (docs/19 «Short links», «Report
// flow»).
const strip = (sql: string) =>
  sql
    .split('\n')
    .filter((l) => !l.trim().startsWith('--'))
    .join('\n');
const links = strip(readFileSync(migrationPath('20261105000300_short_links.sql'), 'utf8'));
const report = strip(
  readFileSync(migrationPath('20261105000301_report_ready_session_report_pdf.sql'), 'utf8'),
);

describe('migration 300: short_links', () => {
  it('code ≥ 8 base62, https targets, unique (kind, subject), RLS on and no client access', () => {
    expect(links).toContain('create table if not exists public.short_links');
    expect(links).toContain("code text primary key check (code ~ '^[A-Za-z0-9]{8,32}$')");
    expect(links).toContain("check (target_url ~ '^https://'");
    expect(links).toContain('unique (kind, subject)');
    expect(links).toContain('alter table public.short_links enable row level security;');
    expect(links).toContain('revoke all on public.short_links from anon, authenticated;');
    expect(links).not.toMatch(/create policy/i);
  });
});

describe('migration 301: report_ready → session_report_pdf', () => {
  it('only the report_ready row: the WABA name, a document header, four values, approved', () => {
    expect(report.match(/update public\.message_templates/g)).toHaveLength(1);
    expect(report).toMatch(/where key = 'report_ready';\s*$/);
    expect(report).toContain("crm_name = 'session_report_pdf'");
    expect(report).toContain("crm_language = 'ar'");
    expect(report).toContain("header_format = 'document'");
    expect(report).toContain("status = 'approved'");
    expect([...report.matchAll(/\{\{(\d)\}\}/g)].map((m) => m[1])).toEqual(['1', '2', '3', '4']);
    expect(report).not.toMatch(/report_session|delete from|insert into/i);
  });

  it('fixes the crm_name check: no regex bound over 255 (Postgres refuses it at the first write)', () => {
    expect(report).toContain('char_length(crm_name) between 1 and 512');
    expect(report).toContain("crm_name ~ '^[a-z0-9_]+$'");
    const bounds = [...report.matchAll(/\{\d+,(\d+)\}/g)].map((m) => Number(m[1]));
    expect(bounds.every((n) => n <= 255)).toBe(true);
  });

  it('the body passes the submit check (no variable at its start or end)', () => {
    const body = /body_ar = '([\s\S]*?)',\n/.exec(report)?.[1] ?? '';
    expect(templateProblem({ body_ar: body, params: ['a', 'b', 'c', 'd'] })).toBeNull();
  });
});

