import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR } from '@/common/db/repo-paths.test-util';

// Migrations 20261117100100..120 (owner 2026-11-16). No database in unit tests: this pins them.
const code = (file: string) =>
  readFileSync(join(MIGRATIONS_DIR, file), 'utf8')
    .split('\n')
    .filter((l) => !l.trimStart().startsWith('--'))
    .join('\n');

describe('migration 100: «إنهاء الحلقة للجميع»', () => {
  it('adds lessons.room_ended_at re-runnably, granting nothing', () => {
    const sql = code('20261117100100_lesson_room_end.sql');
    expect(sql).toContain(
      'alter table public.lessons add column if not exists room_ended_at timestamptz;',
    );
    expect(sql).not.toMatch(/grant |policy/i);
  });
});

describe('migration 110: who is inside the room', () => {
  it('adds entered_at / left_at and a partial index of those inside', () => {
    const sql = code('20261117100110_room_presence.sql');
    expect(sql).toContain('add column if not exists entered_at timestamptz');
    expect(sql).toContain('add column if not exists left_at timestamptz');
    expect(sql).toContain('create index if not exists classroom_participants_inside_idx');
    expect(sql).toContain('where entered_at is not null and left_at is null;');
  });
});

describe('migration 120: a time edit resets the room', () => {
  const sql = code('20261117100120_edit_lesson_time_room.sql');

  it('a moved lesson loses «افتح الحلقة الآن»', () => {
    expect(sql).toContain('create or replace function public.edit_lesson_time(p jsonb)');
    expect(sql).toContain('room_opened_at = case when v_moved then null else l.room_opened_at end');
  });

  it('keeps the teacher confirmation reset and the service-role-only grant', () => {
    expect(sql).toContain(
      'teacher_confirmed_at = case when v_moved then null else l.teacher_confirmed_at end',
    );
    expect(sql).toContain(
      'revoke execute on function public.edit_lesson_time(jsonb) from public, anon, authenticated;',
    );
    expect(sql).toContain(
      'grant execute on function public.edit_lesson_time(jsonb) to service_role;',
    );
  });
});

describe('migration 140: «اللغة» unset until chosen', () => {
  const sql = code('20261117100140_profile_locale_unset.sql');

  it("nullable with no default; the default 'ar' cleared, a deliberate 'en' kept; ar/en only", () => {
    expect(sql).toContain('alter column locale drop not null, alter column locale drop default');
    expect(sql).toContain(
      "update public.profiles set locale = null where locale is distinct from 'en';",
    );
    expect(sql).toContain("check (locale is null or locale in ('ar', 'en'))");
  });
});

describe('migrations 150 / 170: presence order, whom a sent link is for', () => {
  it('adds the columns re-runnably', () => {
    expect(code('20261117100150_room_presence_order.sql')).toContain(
      'add column if not exists presence_at timestamptz',
    );
    const links = code('20261117100170_join_link_sent_for.sql');
    expect(links).toContain(
      'add column if not exists sent_for_student_id uuid references public.students (id) on delete set null',
    );
    expect(links).toContain('create index if not exists lesson_join_links_sent_for_idx');
  });
});

describe('migration 160: edit_lesson_time, review fixes', () => {
  const sql = code('20261117100160_edit_lesson_time_pushes.sql');

  it('the end clears only when the start moves', () => {
    expect(sql).toContain('room_ended_at = case when v_moved then null else l.room_ended_at end');
    expect(sql).not.toContain('room_ended_at = null');
  });

  it('a re-timed lesson frees lesson_starting / lesson_live push keys (uuid suffix, A→B→A safe)', () => {
    const retime = sql.slice(sql.indexOf('retime_open'), sql.indexOf('refresh_pdf'));
    expect(retime).toContain("or dedup_key like 'lesson_starting:lesson:' || v_id::text || ':%'");
    expect(retime).toContain("or dedup_key like 'lesson_live:lesson:' || v_id::text || ':%';");
    expect(retime).toContain("dedup_key || ':old:' || gen_random_uuid()::text");
  });

  it('keeps the service-role-only grant', () => {
    expect(sql).toContain(
      'grant execute on function public.edit_lesson_time(jsonb) to service_role;',
    );
  });
});
