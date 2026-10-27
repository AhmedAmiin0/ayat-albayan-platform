import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CHANNEL_BODY_MAX, CHANNEL_SENDER_ROLES, PUSH_KINDS } from '@ab/shared';
import { describe, expect, it } from 'vitest';

// Migrations 800–801 (docs/31 §2), read as text: no database in unit tests (checked on a local stack when written).
const dir = join(__dirname, '../../../../../../packages/db/supabase/migrations');
const strip = (sql: string) => sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
const sql = readFileSync(join(dir, '20261028000800_student_channels.sql'), 'utf8');
const code = strip(sql);
const kind = strip(readFileSync(join(dir, '20261028000801_push_kind_channel.sql'), 'utf8'));

describe('migration 800: student channels', () => {
  it('three tables, the body and role checks match the shared contract', () => {
    for (const t of ['student_channels', 'channel_messages', 'channel_reads']) expect(code).toContain(`create table if not exists public.${t} (`);
    expect(code).toContain('student_id uuid not null unique references public.students (id) on delete cascade');
    expect(code).toContain(`check (char_length(body) between 1 and ${CHANNEL_BODY_MAX})`);
    const roles = [...(/sender_role in \(([^)]*)\)/.exec(code)?.[1] ?? '').matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
    expect(roles).toEqual([...CHANNEL_SENDER_ROLES]);
    expect(code).toContain('primary key (channel_id, profile_id)');
  });

  it('a students INSERT trigger opens the channel; the backfill inserts new rows only', () => {
    expect(code).toContain('create trigger students_open_channel after insert on public.students');
    expect(code).toContain('insert into public.student_channels (student_id) values (new.id) on conflict (student_id) do nothing;');
    expect(code).toMatch(/insert into public\.student_channels \(student_id\)\nselect s\.id from public\.students s\non conflict \(student_id\) do nothing;/);
    expect(code).not.toMatch(/\bupdate public\.students\b|\bdelete from\b/i);
  });

  it('a merge moves the messages to the kept channel', () => {
    expect(code).toContain('update public.channel_messages set channel_id = kept where channel_id = old.id;');
    expect(code).toContain('before update of student_id on public.student_channels');
  });

  it('current teachers only: the assigned teacher or an open lesson running or within a day (no 90-day look-back)', () => {
    const fn = /function public\.channel_teacher_ids[\s\S]*?\$\$([\s\S]*?)\$\$/.exec(code)?.[1] ?? '';
    expect(fn).toContain('s.teacher_id');
    expect(fn).toContain("l.status in ('scheduled', 'confirmed') and l.ends_at >= now()");
    expect(fn).toContain("l.starts_at < now() + interval '1 day'");
    expect(fn).not.toMatch(/90 days/);
  });

  it('RLS on all three, reads only, no client writes; the helpers are service role or definer with search_path', () => {
    for (const t of ['student_channels', 'channel_messages', 'channel_reads']) expect(code).toContain(`alter table public.${t} enable row level security;`);
    expect(code).not.toMatch(/create policy \w+ on public\.\w+ for (insert|update|delete|all)/);
    expect(code).toMatch(/revoke insert, update, delete, truncate, references, trigger\s+on public\.student_channels, public\.channel_messages, public\.channel_reads from authenticated;/);
    for (const fn of ['channel_teacher_ids(uuid)', 'teacher_channel_student_ids(uuid)', 'channel_summaries(uuid, uuid[], text[])']) {
      expect(code).toContain(`revoke execute on function public.${fn} from public, anon, authenticated;`);
    }
    expect([...code.matchAll(/security definer set search_path = ''/g)].length).toBe([...code.matchAll(/create or replace function/g)].length);
  });

  it('seeds student_channels.monitor for the system admin, idempotently; 801 adds the push kind', () => {
    expect(code).toMatch(/'student_channels\.monitor' from public\.roles r where r\.is_system and r\.key in \('admin'\)\non conflict do nothing;/);
    expect(kind).toContain("alter type public.push_kind add value if not exists 'channel_message';");
    expect(PUSH_KINDS).toContain('channel_message');
    expect(sql).toContain('MANUAL ROLLBACK');
  });
});
