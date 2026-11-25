import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR } from '@/common/db/repo-paths.test-util';

// Migrations 20261028000921 (thread_summaries behind v_threads) and 863 (the catch-up's partial indexes)
// read as text: idempotent, RLS on the new table, triggers before the backfill, the same v_threads columns.
// The rows themselves are proven equal in e2e/tests/thread-summaries.sql.spec.ts (a real database).
const dir = MIGRATIONS_DIR;
const read = (f: string) => readFileSync(join(dir, f), 'utf8').replace(/--.*$/gm, '');
const SUMMARY = read('20261028000921_thread_summaries.sql');
const CATCHUP = read('20261028000922_external_catchup_index.sql');

describe('migration 20261028000921: thread_summaries', () => {
  it('sorts after every migration of develop at the time (through 861)', () => {
    const all = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
    expect(all.indexOf('20261028000921_thread_summaries.sql')).toBeGreaterThan(all.indexOf('20261028000861_report_pdf_queue_idx.sql'));
  });

  it('is re-runnable: if not exists, or replace, drop … if exists before every create trigger / policy', () => {
    expect(SUMMARY).toContain('create table if not exists public.thread_summaries');
    expect(SUMMARY.match(/create trigger/g)).toHaveLength(4);
    expect(SUMMARY.match(/drop trigger if exists thread_summaries_/g)).toHaveLength(4);
    expect(SUMMARY).not.toMatch(/create (function|view)\b/);
    expect(SUMMARY).not.toMatch(/concurrently/i);
    expect(SUMMARY).toMatch(/on conflict \(phone_e164\) do update set/);
  });

  it('RLS on the new table: the admin reads, nobody but the service role writes', () => {
    expect(SUMMARY).toContain('alter table public.thread_summaries enable row level security');
    expect(SUMMARY).toContain('using (public.is_admin())');
    expect(SUMMARY).toContain('revoke insert, update, delete, truncate, references, trigger on public.thread_summaries from authenticated');
    expect(SUMMARY).toMatch(/revoke all on function public\.thread_summary_refresh\(text\) from public, anon, authenticated/);
  });

  it('the triggers go live before the backfill (no row written in between is missed)', () => {
    expect(SUMMARY.indexOf('create trigger thread_summaries_insert')).toBeLessThan(SUMMARY.lastIndexOf('insert into public.thread_summaries as s (phone_e164'));
  });

  it('a per-phone advisory lock serialises the recompute; phones are locked in lock-key order', () => {
    expect(SUMMARY).toContain('pg_advisory_xact_lock(850, hashtext(p_phone))');
    expect(SUMMARY).toContain('order by hashtext(d.x), d.x');
  });

  it('the update trigger passes every status / text tick on: no unlocked read of thread_summaries to skip it', () => {
    const update = SUMMARY.slice(SUMMARY.indexOf('function public.thread_summaries_on_update'), SUMMARY.indexOf('function public.thread_summaries_on_truncate'));
    expect(update).toContain('or (o.status, o.body, o.template_key, o.media_mime) is distinct from (n.status, n.body, n.template_key, n.media_mime)');
    expect(update).not.toContain('thread_summaries s');
  });

  it('v_threads keeps its 23 columns in order (create or replace refuses anything else) and its grants', () => {
    const view = SUMMARY.slice(SUMMARY.indexOf('create or replace view public.v_threads'));
    expect(view).toMatch(/select s\.phone_e164, s\.last_message_id, s\.last_direction, s\.last_body, s\.last_template_key,\s+s\.last_status/);
    expect(view).toMatch(/as display_name,\s+s\.last_inbound_line, s\.last_chat_inbound_at, s\.last_notifications_inbound_at\s+from public\.thread_summaries s/);
    expect(view).toContain('revoke all on public.v_threads from anon, authenticated');
    expect(view).toContain('create or replace view public.v_list_threads');
  });

  it('carries its rollback note', () => {
    expect(readFileSync(join(dir, '20261028000921_thread_summaries.sql'), 'utf8')).toContain('MANUAL ROLLBACK');
  });
});

describe('migration 20261028000922: the external catch-up indexes', () => {
  it('two plain partial indexes matching newestExternal’s filter, by number and by line', () => {
    const where = "where direction = 'outbound' and created_by is null and attempts = 0 and wa_message_id is not null";
    expect(CATCHUP).toContain(`create index if not exists messages_external_number_idx on public.messages (number_id, created_at desc)\n  ${where}`);
    expect(CATCHUP).toContain(`create index if not exists messages_external_line_idx on public.messages (line, created_at desc)\n  ${where}`);
    expect(CATCHUP).not.toMatch(/concurrently/i);
  });
});
