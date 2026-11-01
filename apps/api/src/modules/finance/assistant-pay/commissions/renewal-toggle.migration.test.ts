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
  /\s+if r\.id is null and public\.subscription_full_at\(p_subscription\) >= public\.renewal_commission_off_since\(\)\s+and public\.subscription_commission_kind\(p_subscription\) = 'renewal' then\s+insert into public\.assistant_commission_exclusions \(subscription_id, reason\)\s+values \(p_subscription, 'renewal_off'\) on conflict do nothing;\s+end if;/;
// The settle of a NEW renewal row needs the switch on; an existing row settles as in 751.
const GATE =
  "if r.kind = 'renewal' or (r.id is null and public.renewal_commission_enabled() and public.subscription_commission_kind(p_subscription) = 'renewal') then";
const flat = (text: string) => text.replace(/\s+/g, ' ');

describe('migration 20261101000996 renewal_commission_toggle', () => {
  it('the switch: only a JSON boolean counts; missing, null or anything else is ON', () => {
    const body = fn(sql, 'renewal_commission_enabled');
    expect(body).toMatch(/returns boolean\s+language sql stable set search_path = ''/);
    expect(body).toMatch(/coalesce\(\(\s+select s\.value = 'true'::jsonb from public\.settings s\s+where s\.key = 'renewal_commission_enabled' and jsonb_typeof\(s\.value\) = 'boolean'\s+\), true\)/);
    expect(sql).toMatch(/revoke execute on function public\.renewal_commission_enabled\(\), public\.renewal_commission_off_since\(\)\s+from public, anon, authenticated;/);
    expect(sql).toContain('grant execute on function public.renewal_commission_enabled(), public.renewal_commission_off_since() to service_role;');
  });

  it('the switch-off instant: settings.updated_at of a JSON false only; null while on', () => {
    expect(fn(sql, 'renewal_commission_off_since')).toMatch(
      /returns timestamptz\s+language sql stable set search_path = '' as \$\$\s+select s\.updated_at from public\.settings s\s+where s\.key = 'renewal_commission_enabled' and s\.value = 'false'::jsonb\s*$/,
    );
  });

  it("the share is migration 751's, untouched: an existing renewal row settles at it whatever the switch", () => {
    expect(fn(sql, 'renewal_commission_share')).toBe('');
    expect(fn(rules, 'renewal_commission_share')).not.toBe('');
  });

  it("the evaluator is migration 751's plus the 'renewal_off' snapshot (paid since the switch-off) and the switch on a new row", () => {
    const after = fn(sql, 'evaluate_assistant_commission');
    expect(OFF_BLOCK.test(after)).toBe(true);
    expect(flat(after)).toContain(GATE);
    const without = flat(after.replace(OFF_BLOCK, '')).replace('public.renewal_commission_enabled() and ', '');
    expect(without).toBe(flat(fn(rules, 'evaluate_assistant_commission')));
    expect(after.indexOf("'renewal_off'")).toBeGreaterThan(after.indexOf("'paid_before_cutoff'"));
    expect(after.indexOf("'renewal_off'")).toBeLessThan(after.indexOf("settle_assistant_commission('renewal'"));
  });

  it('widens the exclusion reasons, seeds the switch ON without touching a saved value, and nothing else', () => {
    expect(sql).toContain("check (reason in ('paid_before_cutoff', 'student_merged', 'renewal_off'))");
    expect(sql).toMatch(/insert into public\.settings \(key, value\) values \('renewal_commission_enabled', 'true'::jsonb\)\s+on conflict \(key\) do nothing;/);
    // The share, the plan and the settle are untouched: every earn path reaches settle through
    // the evaluator.
    expect(sql).not.toMatch(/renewal_commission_share\(\) returns|assistant_commission_plan|function public\.settle_assistant_commission|update public\.|delete from/);
    expect(sql).toContain("set local lock_timeout = '5s';");
  });
});
