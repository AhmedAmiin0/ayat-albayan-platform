import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR } from '@/common/db/repo-paths.test-util';

// Migration 942 (owner 2026-10-28, «If the course already started so dont give commission»).
const dir = MIGRATIONS_DIR;
const code = (name: string) => readFileSync(join(dir, name), 'utf8').replace(/--.*$/gm, '');
const sql = code('20261028000942_commission_started_course.sql');
const planOf = (text: string) => {
  const from = text.indexOf('create or replace function public.assistant_commission_plan');
  return text.slice(from, text.indexOf('end $$;', from));
};

describe('migration 20261028000942 commission_started_course', () => {
  it('started = starts_on before the Riyadh day of created_at, or lessons_used_before > 0', () => {
    expect(sql).toMatch(/create or replace function public\.subscription_already_started\(p_subscription uuid\) returns boolean\s+language sql stable set search_path = ''/);
    expect(sql).toContain("s.starts_on < (s.created_at at time zone 'Asia/Riyadh')::date or s.lessons_used_before > 0");
  });

  it('the plan returns no row for a started subscription, for both kinds, before anything else is read', () => {
    const plan = planOf(sql);
    expect(plan).toMatch(/if public\.subscription_already_started\(s\.id\) then\s+return;\s+end if;/);
    expect(plan.indexOf('subscription_already_started')).toBeLessThan(plan.indexOf('subscription_full_at'));
  });

  it('otherwise the plan of migration 751, unchanged', () => {
    const before = planOf(code('20261027000751_renewal_commission_rules.sql'));
    const after = planOf(sql).replace(/\s+if public\.subscription_already_started\(s\.id\) then\s+return;\s+end if;/, '');
    expect(after).toBe(before);
  });

  it('touches no row, the kind or the settle; locks briefly; service role only', () => {
    expect(sql).toContain("set local lock_timeout = '5s';");
    expect(sql).not.toMatch(/\b(insert into|update public\.|delete from)\b/);
    expect(sql).not.toMatch(/subscription_commission_kind|settle_assistant_commission|evaluate_assistant_commission/);
    expect(sql).toContain('revoke execute on function public.subscription_already_started(uuid) from public, anon, authenticated;');
    expect(sql).toContain('grant execute on function public.subscription_already_started(uuid) to service_role;');
  });
});
