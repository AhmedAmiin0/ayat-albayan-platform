import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Migration 991 (PR #464 review): what the SQL specs (e2e/tests/teaching/course-stop-*.sql.spec.ts)
// prove against the database, pinned on the file so a later edit cannot drop it silently.
const dir = join(__dirname, '../../../../../../packages/db/supabase/migrations');
const sql = readFileSync(join(dir, '20261030000991_course_stop_keep_money.sql'), 'utf8').replace(
  /--.*$/gm,
  '',
);
const body = (fn: string) => sql.slice(sql.indexOf(`function public.${fn}(`), sql.length);
const until = (text: string, end: string) => text.slice(0, text.indexOf(end));

describe('migration 991', () => {
  it('B1: every money reader keeps a stopped package', () => {
    for (const reader of ['subscription_full_at', 'subscription_commission_kind'])
      expect(until(body(reader), '$$;')).toContain("cancel_kind = 'stopped'");
    for (const view of ['v_package_lessons', 'v_subscription_balance'])
      expect(until(sql.slice(sql.indexOf(`view public.${view}`)), ';\n')).toContain(
        "cancel_kind = 'stopped'",
      );
    expect(sql).not.toMatch(/status <> 'cancelled'\)/);
  });

  it('B1: a stopped package keeps only what it used at the stop (the next package never fills it)', () => {
    const view = until(sql.slice(sql.indexOf('view public.v_subscription_balance')), ';\n');
    expect(view).toMatch(/when s\.cancel_kind = 'stopped' then coalesce\(s\.lessons_used_at_stop, s\.lessons_total\)/);
    expect(view).toMatch(/sum\(s\.cap\) over \(w rows between unbounded preceding and 1 preceding\)/);
    const stop = until(body('stop_course'), 'end $$;');
    expect(stop).toMatch(/select least\(b\.lessons_used, s\.lessons_total\) into v_used/);
    expect(stop).toMatch(/stop_request_id = v_request, lessons_used_at_stop = /);
  });

  it('B3: the stamp writes stop_request_id in the same update; a replay reads it', () => {
    const stop = until(body('stop_course'), 'end $$;');
    expect(stop).toMatch(/cancel_reason = v_reason, stop_request_id = v_request/);
    expect(stop).toMatch(/s\.stop_request_id is distinct from v_request/);
    expect(sql).toMatch(/create unique index if not exists subscriptions_stop_request_idx/);
  });

  it('B2: the stop and change_course find the course through course_rules_of; 409 course_unattributed', () => {
    expect(until(body('course_stop_plan'), '$$;')).toContain('public.course_rules_of(p_subscription)');
    const change = until(body('change_course'), 'end $$;');
    expect(change).toContain('public.course_rules_of(v_sub)');
    expect(change).not.toMatch(/r\.subscription_id = v_sub/);
    expect(change).toContain("'course_unattributed'");
  });

  it('service role only for the new functions', () => {
    for (const fn of ['course_rules_of(uuid)', 'course_stop_plan(uuid, timestamptz)', 'stop_course(jsonb)'])
      expect(sql).toContain(`revoke execute on function public.${fn} from public, anon, authenticated`);
  });
});
