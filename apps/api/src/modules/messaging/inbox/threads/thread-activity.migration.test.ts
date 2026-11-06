import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR } from '@/common/db/repo-paths.test-util';

// Migration 20261106001100 (docs/44 K4, §3; BUG4, BUG9) read as text: v_threads on thread_summaries
// keeps every column of migration 984's definition in order, with its joins and grants, and appends
// the two activity columns. The rows are compared column by column on a real database in
// e2e/tests/messaging/thread-activity.sql.spec.ts.
const FILE = '20261106001100_thread_summaries_activity.sql';
const read = (f: string) => readFileSync(join(MIGRATIONS_DIR, f), 'utf8').replace(/--.*$/gm, '');
const NEW = read(FILE);
const OLD = read('20261030000984_calls_number.sql');
const REFRESH_992 = read('20261030000992_chat_markers.sql');

/** The statement from `start` to its closing `;` (a view or a plain statement). */
const statement = (sql: string, start: string) => {
  const at = sql.indexOf(start);
  return sql.slice(at, sql.indexOf(';', at));
};
/** A plpgsql function body (`as $$ … $$`). */
const fn = (sql: string, name: string) => {
  const at = sql.lastIndexOf(`create or replace function public.${name}`);
  return sql.slice(at, sql.indexOf('end $$;', at));
};

/** Commas outside parentheses only (the parentheses' contents are dropped: only aliases matter). */
function splitTop(list: string): string[] {
  let flat = list;
  while (/\([^()]*\)/.test(flat)) flat = flat.replace(/\([^()]*\)/g, '');
  return flat.split(',').map((p) => p.trim());
}

/** The output column names of a view's final select, in order. */
function viewColumns(sql: string): string[] {
  const view = statement(sql, 'create or replace view public.v_threads');
  const select = view.slice(view.lastIndexOf('\nselect ') + 8);
  const list = select.slice(0, select.indexOf('\nfrom '));
  return splitTop(list).map((c) => c.split(/\s+as\s+|\./).pop() ?? c);
}

/** A view's final from-and-joins, alias of the base table normalised to `x`. */
function joins(sql: string, base: string): string[] {
  const view = statement(sql, 'create or replace view public.v_threads');
  const from = view.slice(view.lastIndexOf('\nfrom '));
  return [...from.matchAll(/left join public\.[^\n]+/g)].map((m) =>
    m[0].replaceAll(`${base}.`, 'x.'),
  );
}

describe(`migration ${FILE}: v_threads on thread_summaries`, () => {
  it('sorts after every migration of develop (through 20261106000700)', () => {
    const all = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    expect(all.indexOf(FILE)).toBeGreaterThan(all.indexOf('20261106000700_evolution_driver.sql'));
  });

  it('keeps 984’s 23 columns in order and appends the two activity columns at the end', () => {
    const old = viewColumns(OLD);
    expect(old).toHaveLength(23);
    expect(viewColumns(NEW)).toEqual([...old, 'last_family_read_at', 'last_activity_at']);
  });

  it('reads thread_summaries with 984’s joins (guardian_phones) and its grants', () => {
    const view = statement(NEW, 'create or replace view public.v_threads');
    expect(view).toContain('with (security_invoker = true)');
    expect(view).toMatch(/\nfrom public\.thread_summaries s\n/);
    expect(view).not.toMatch(/public\.messages/);
    expect(joins(OLD, 'm')).toHaveLength(4);
    expect(joins(NEW, 's')).toEqual(joins(OLD, 'm'));
    expect(NEW).toContain('revoke all on public.v_threads from anon, authenticated;');
    expect(NEW).toContain('grant select on public.v_threads to service_role;');
    expect(NEW).toContain('revoke all on public.v_list_threads from anon, authenticated;');
  });

  it('the refresh keeps every rule of 992 (reactions, calls line) with the id tiebreak (BUG9)', () => {
    const body = fn(NEW, 'thread_summary_refresh(');
    for (const rule of [
      'where m.phone_e164 = p_phone and not public.message_is_reaction(m.interactive_payload)',
      'order by m.created_at desc, m.id desc limit 1',
      "max(m.created_at) filter (where m.line = 'chat') as last_chat_inbound_at",
      "m.line is distinct from 'chat' and m.line is distinct from 'calls'",
      '(array_agg(m.line order by m.created_at desc, m.id desc))[1] as last_inbound_line',
      "from public.messages m where m.phone_e164 = p_phone and m.direction = 'inbound'",
      'pg_advisory_xact_lock(850, hashtext(p_phone))',
    ]) {
      expect(fn(REFRESH_992, 'thread_summary_refresh(')).toContain(rule);
      expect(body).toContain(rule);
    }
    expect(body.replace(/\s+/g, ' ')).toContain(
      'm.read_at is null and not public.message_is_reaction(m.interactive_payload)',
    );
  });

  it('activity: newest OUTBOUND read_at only; last_activity_at = greatest of the two', () => {
    const body = fn(NEW, 'thread_summary_refresh(');
    expect(body.replace(/\s+/g, ' ')).toContain(
      'max(m.read_at) as last_family_read_at from public.messages m ' +
        "where m.phone_e164 = p_phone and m.direction = 'outbound' and m.read_at is not null",
    );
    expect(body).toContain('greatest(i.last_inbound_at, r.last_family_read_at)');
    expect(body).toContain('last_activity_at = excluded.last_activity_at');
    expect(NEW).toContain('add column if not exists last_family_read_at timestamptz;');
    expect(NEW).toContain("where direction = 'outbound' and read_at is not null;");
  });

  it('the update trigger also fires on an outbound read_at alone, keeping 921’s rules', () => {
    const update = fn(NEW, 'thread_summaries_on_update(');
    expect(update).toContain(
      "or (n.direction = 'outbound' and o.read_at is distinct from n.read_at)",
    );
    expect(update).toContain("(n.direction = 'inbound' and (o.read_at, o.line) is distinct from");
    expect(update).toContain('(o.status, o.body, o.template_key, o.media_mime) is distinct from');
    expect(update).not.toContain('thread_summaries s');
  });

  it('backfills every phone set-based with the same tiebreak, after locking messages', () => {
    expect(NEW).toContain('order by phone_e164, created_at desc, id desc');
    expect(NEW.indexOf('lock table public.messages in share row exclusive mode')).toBeLessThan(
      NEW.indexOf('alter table public.thread_summaries'),
    );
    expect(NEW.indexOf('function public.thread_summary_refresh(')).toBeLessThan(
      NEW.lastIndexOf('insert into public.thread_summaries as s'),
    );
    expect(NEW).toMatch(/on conflict \(phone_e164\) do update set/);
    expect(NEW).not.toMatch(/concurrently|drop (table|column|view)/i);
  });

  it('carries its rollback note', () => {
    expect(readFileSync(join(MIGRATIONS_DIR, FILE), 'utf8')).toContain('MANUAL ROLLBACK');
  });
});
