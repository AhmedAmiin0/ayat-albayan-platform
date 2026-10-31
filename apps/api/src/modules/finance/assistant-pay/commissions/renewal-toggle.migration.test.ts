import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR } from '@/common/db/repo-paths.test-util';

// Migration 996 (owner 2026-11-01: «dont apply the commission on renewal — toggle it off
// from configuration»).
const code = (name: string) => readFileSync(join(MIGRATIONS_DIR, name), 'utf8').replace(/--.*$/gm, '');
const sql = code('20261101000996_renewal_commission_toggle.sql');
const rules = code('20261027000751_renewal_commission_rules.sql');
const fn = (text: string, name: string) => {
  const from = text.indexOf(`create or replace function public.${name}(`);
  return from < 0 ? '' : text.slice(from, text.indexOf('$$;', text.indexOf('$$', from) + 2));
};
const OFF_BLOCK =
  /\s+if r\.id is null and not public\.renewal_commission_enabled\(\)\s+and public\.subscription_full_at\(p_subscription\) is not null\s+and public\.subscription_commission_kind\(p_subscription\) = 'renewal' then\s+insert into public\.assistant_commission_exclusions \(subscription_id, reason\)\s+values \(p_subscription, 'renewal_off'\) on conflict do nothing;\s+end if;/;

describe('migration 20261101000996 renewal_commission_toggle', () => {
  it('the switch: only a JSON boolean counts; missing, null or anything else is ON', () => {
    const body = fn(sql, 'renewal_commission_enabled');
    expect(body).toMatch(/returns boolean\s+language sql stable set search_path = ''/);
    expect(body).toMatch(/coalesce\(\(\s+select s\.value = 'true'::jsonb from public\.settings s\s+where s\.key = 'renewal_commission_enabled' and jsonb_typeof\(s\.value\) = 'boolean'\s+\), true\)/);
    expect(sql).toContain('revoke execute on function public.renewal_commission_enabled() from public, anon, authenticated;');
    expect(sql).toContain('grant execute on function public.renewal_commission_enabled() to service_role;');
  });

  it("the share is migration 751's while on and 0 while off (the plan then earns nothing)", () => {
    const before = /coalesce\(\(select least[\s\S]*?, 50\)/.exec(fn(rules, 'renewal_commission_share'))?.[0] ?? 'missing';
    const after = fn(sql, 'renewal_commission_share');
    expect(after).toMatch(/select case when public\.renewal_commission_enabled\(\) then\s+coalesce/);
    expect(after.replace(/\s+/g, ' ')).toContain(before.replace(/\s+/g, ' '));
    expect(after).toMatch(/else 0 end::smallint/);
  });

  it("the evaluator is migration 751's plus the 'renewal_off' snapshot, after the cutoff's and before the settle", () => {
    const after = fn(sql, 'evaluate_assistant_commission');
    expect(OFF_BLOCK.test(after)).toBe(true);
    expect(after.replace(OFF_BLOCK, '')).toBe(fn(rules, 'evaluate_assistant_commission'));
    expect(after.indexOf("'renewal_off'")).toBeGreaterThan(after.indexOf("'paid_before_cutoff'"));
    expect(after.indexOf("'renewal_off'")).toBeLessThan(after.indexOf("settle_assistant_commission('renewal'"));
  });

  it('widens the exclusion reasons, seeds the switch ON without touching a saved value, and nothing else', () => {
    expect(sql).toContain("check (reason in ('paid_before_cutoff', 'student_merged', 'renewal_off'))");
    expect(sql).toMatch(/insert into public\.settings \(key, value\) values \('renewal_commission_enabled', 'true'::jsonb\)\s+on conflict \(key\) do nothing;/);
    // The plan and the settle are untouched: every earn path reaches the plan, which reads
    // the share.
    expect(sql).not.toMatch(/assistant_commission_plan|function public\.settle_assistant_commission|update public\.|delete from/);
    expect(sql).toContain("set local lock_timeout = '5s';");
  });
});
