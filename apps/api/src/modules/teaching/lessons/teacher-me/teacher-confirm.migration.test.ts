import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Migration 20261111000200 (docs/46 C4). No database runs in unit tests: this pins its shape.
const dir = join(__dirname, '../../../../../../../packages/db/supabase/migrations');
const sql = readFileSync(join(dir, '20261111000200_lesson_teacher_confirm.sql'), 'utf8');
const code = sql.split('\n').filter((l) => !l.trimStart().startsWith('--')).join('\n');
const confirmFn = code.slice(code.indexOf('function public.teacher_confirm_lesson'), code.indexOf('end $$;'));

describe('migration 20261111000200: the teacher «سأحضر»', () => {
  it('adds the two columns re-runnably', () => {
    expect(code).toContain('add column if not exists teacher_confirmed_at timestamptz');
    expect(code).toContain('add column if not exists teacher_confirmed_by uuid');
  });

  it('teacher_confirm_lesson: locked, hers, open, not started; never writes the status; service role only', () => {
    expect(code).toContain('for update');
    expect(code).toContain("if v.teacher_id <> p_teacher then return 'not_owner'");
    expect(code).toContain("if v.status not in ('scheduled', 'confirmed') then return 'closed'");
    expect(code).toContain("if v.starts_at <= now() then return 'started'");
    expect(confirmFn).toContain('set teacher_confirmed_at = now(), teacher_confirmed_by = p_actor');
    expect(confirmFn).not.toMatch(/status\s*=/);
    expect(code).toContain('from public, anon, authenticated');
    expect(code).toContain('grant execute on function public.teacher_confirm_lesson(uuid, uuid, uuid) to service_role');
  });

  it('a moved lesson clears the teacher confirmation, like confirmed_at', () => {
    expect(code).toContain('create or replace function public.edit_lesson_time(p jsonb)');
    expect(code).toContain('teacher_confirmed_at = case when v_moved then null else l.teacher_confirmed_at end');
    expect(code).toContain('teacher_confirmed_by = case when v_moved then null else l.teacher_confirmed_by end');
    expect(code).toContain('grant execute on function public.edit_lesson_time(jsonb) to service_role');
  });
});
