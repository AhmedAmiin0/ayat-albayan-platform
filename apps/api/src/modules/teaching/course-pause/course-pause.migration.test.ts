import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Migrations 950–953 (owner 2026-10-28, «Also add option to pause the course»; docs/11 §7b).
const dir = join(__dirname, '../../../../../../packages/db/supabase/migrations');
const code = (name: string) => readFileSync(join(dir, name), 'utf8').replace(/--.*$/gm, '');
const table = code('20261028000950_course_pauses.sql');
const rpcs = code('20261028000951_course_pause_rpcs.sql');
const generate = code('20261028000952_generate_skips_paused.sql');
const fn = (name: string) => {
  const start = rpcs.indexOf(`function public.${name}(`);
  return rpcs.slice(start, rpcs.indexOf('end $$;', start));
};

describe('migration 950 course_pauses', () => {
  it('one open pause per student (unique partial index) and the history columns', () => {
    expect(table).toMatch(/create unique index if not exists course_pauses_one_open on public\.course_pauses \(student_id\) where resumed_at is null/);
    for (const col of ['student_id uuid not null', 'subscription_id uuid', 'rule_ids uuid[]', 'from_date date not null', 'until_date date', 'reason text',
      'created_by uuid', 'created_at timestamptz', 'resumed_at timestamptz', 'resumed_by uuid', 'extended_days int'])
      expect(table).toContain(col);
    expect(table).toMatch(/check \(\(resumed_at is null\) = \(extended_days is null\)\)/);
  });

  it('RLS on both tables: admins read, sales read, nobody writes from a client', () => {
    expect(table.match(/enable row level security/g)).toHaveLength(2);
    expect(table).toMatch(/course_pauses_admin_read on public\.course_pauses for select to authenticated\s+using \(\(select public\.is_admin\(\)\)\)/);
    expect(table).toMatch(/course_pauses_sales_read on public\.course_pauses for select to authenticated\s+using \(\(select public\.auth_role\(\)\) = 'sales'\)/);
    expect(table).toMatch(/revoke insert, update, delete, truncate, references, trigger on public\.course_pauses, public\.course_pause_lessons from authenticated/);
    expect(table).not.toMatch(/for (insert|update|delete|all)/);
  });
});

describe('migration 951 course pause RPCs', () => {
  it('the window cancels a lone student\'s open future lessons by the academy, «إيقاف مؤقت», not chargeable', () => {
    const w = fn('course_pause_window');
    expect(w).toMatch(/l\.status in \('scheduled', 'confirmed'\) and l\.starts_at > now\(\)/);
    expect(w).toMatch(/set status = 'cancelled_by_admin', cancel_reason = 'إيقاف مؤقت'/);
    expect(w).toMatch(/set chargeable = false where lesson_id = any\(v_cancel\)/);
  });

  it('a group lesson keeps the others: only the student\'s lesson_students row goes', () => {
    const w = fn('course_pause_window');
    expect(w).toMatch(/case when t\.n = 1 then 'cancelled' else 'left' end/);
    expect(w).toMatch(/delete from public\.lesson_students where lesson_id = any\(v_leave\) and student_id = cp\.student_id/);
  });

  it('start refuses a past day, a bad range and a second open pause, and pauses only the rules the student is alone on', () => {
    const s = fn('course_pause_start');
    expect(s).toMatch(/raise exception 'date_in_past'/);
    expect(s).toMatch(/raise exception 'invalid_range'/);
    expect(s).toMatch(/raise exception 'already_paused'/);
    expect(s).toMatch(/filter \(where n = 1\)/);
    expect(s).toMatch(/if v_from <= \(now\(\) at time zone 'Asia\/Riyadh'\)::date then\s+v_begin := public\.course_pause_begin/);
    const b = fn('course_pause_begin');
    expect(b).toMatch(/if cp\.started_at is not null or cp\.resumed_at is not null then\s+return/);
    expect(b).toMatch(/update public\.schedule_rules set status = 'paused' where id = any\(cp\.rule_ids\) and status = 'active'/);
  });

  it('resume is idempotent and moves the dates exactly once by the paused Riyadh days', () => {
    const r = fn('course_pause_resume');
    expect(r).toMatch(/for update;\s+if cp\.id is null/);
    expect(r).toMatch(/if cp\.resumed_at is not null then\s+return jsonb_build_object\('id', cp\.id, 'student_id', cp\.student_id, 'resumed', false/);
    expect(r).toMatch(/v_on := least\(coalesce\(\(p ->> 'on'\)::date, \(now\(\) at time zone 'Asia\/Riyadh'\)::date\), cp\.until_date \+ 1\)/);
    expect(r).toMatch(/v_days := greatest\(0, v_on - cp\.from_date\)/);
    expect(r).toMatch(/ends_on = case when r\.starts_on <= v_on then r\.ends_on \+ v_days else r\.ends_on end/);
    expect(r).toMatch(/renews_on = s\.renews_on \+ v_days/);
    expect(r).toMatch(/resumed_at = now\(\), resumed_by = v_actor, extended_days = v_days/);
  });

  it('never queues a message (it drops the queued ones of its lessons), and only the service role may call it', () => {
    expect(rpcs).not.toMatch(/insert into public\.messages/);
    expect(fn('course_pause_window')).toMatch(/delete from public\.messages m\s+where m\.direction = 'outbound' and m\.status = 'queued'/);
    for (const f of ['course_pause_start', 'course_pause_begin', 'course_pause_set_until', 'course_pause_resume'])
      expect(rpcs).toContain(`grant execute on function public.${f}(jsonb) to service_role;`);
    expect(rpcs).not.toMatch(/to (anon|authenticated);/);
    expect(rpcs).not.toMatch(/security definer/);
  });
});

describe('migration 952 generate_rule_lessons', () => {
  it('skips a student whose open pause covers the lesson, keeps the rule lock and on conflict do nothing', () => {
    expect(generate).toMatch(/for update;\s+if r\.id is null or r\.status <> 'active'/);
    expect(generate).toMatch(/on conflict do nothing/);
    expect(generate).toMatch(/c\.student_id = rs\.student_id and c\.resumed_at is null/);
    // Never a lesson nobody is on: every student paused that day → no row.
    expect(generate).toMatch(/where not exists \(select 1 from public\.schedule_rule_students rs where rs\.rule_id = p_rule\)\s+or exists/);
  });
});
