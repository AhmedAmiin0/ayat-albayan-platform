import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR } from '@/common/db/repo-paths.test-util';

// Migrations 20261117000100..120 (owner 2026-11-16). No database in unit tests: this pins them.
const code = (file: string) =>
  readFileSync(join(MIGRATIONS_DIR, file), 'utf8')
    .split('\n')
    .filter((l) => !l.trimStart().startsWith('--'))
    .join('\n');

describe('migration 100: «إنهاء الحلقة للجميع»', () => {
  it('adds lessons.room_ended_at re-runnably, granting nothing', () => {
    const sql = code('20261117000100_lesson_room_end.sql');
    expect(sql).toContain(
      'alter table public.lessons add column if not exists room_ended_at timestamptz;',
    );
    expect(sql).not.toMatch(/grant |policy/i);
  });
});

describe('migration 110: who is inside the room', () => {
  it('adds entered_at / left_at and a partial index of those inside', () => {
    const sql = code('20261117000110_room_presence.sql');
    expect(sql).toContain('add column if not exists entered_at timestamptz');
    expect(sql).toContain('add column if not exists left_at timestamptz');
    expect(sql).toContain('create index if not exists classroom_participants_inside_idx');
    expect(sql).toContain('where entered_at is not null and left_at is null;');
  });
});

describe('migration 120: a time edit resets the room', () => {
  const sql = code('20261117000120_edit_lesson_time_room.sql');

  it('a moved lesson loses «افتح الحلقة الآن»; every edit clears the end', () => {
    expect(sql).toContain('create or replace function public.edit_lesson_time(p jsonb)');
    expect(sql).toContain('room_opened_at = case when v_moved then null else l.room_opened_at end');
    expect(sql).toContain('room_ended_at = null');
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
