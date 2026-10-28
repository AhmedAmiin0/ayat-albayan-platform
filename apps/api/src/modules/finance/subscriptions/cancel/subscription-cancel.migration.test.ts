import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Migrations 20261028000933/934 «إلغاء الباقة» (owner 2026-10-28): the value, the columns, then every reader.

const dir = join(__dirname, '../../../../../../../packages/db/supabase/migrations');
const read = (name: string) => readFileSync(join(dir, name), 'utf8').replace(/--.*$/gm, '');
const m933 = read('20261028000933_subscription_cancelled.sql');
const m934 = read('20261028000934_subscription_cancelled_readers.sql');

describe('migration 933: the value and the columns', () => {
  it('adds the enum value and never uses it in the same file (ALTER TYPE … ADD VALUE)', () => {
    expect(m933).toMatch(/alter type public\.subscription_status add value if not exists 'cancelled';/);
    expect(m933.match(/'cancelled'/g)).toHaveLength(1);
  });

  it('cancelled_at, cancelled_by → profiles (indexed), cancel_reason ≤ 500', () => {
    expect(m933).toMatch(/add column if not exists cancelled_at timestamptz/);
    expect(m933).toMatch(/add column if not exists cancelled_by uuid references public\.profiles \(id\) on delete set null/);
    expect(m933).toMatch(/add column if not exists cancel_reason text check \(char_length\(cancel_reason\) <= 500\)/);
    expect(m933).toMatch(/create index if not exists subscriptions_cancelled_by_idx on public\.subscriptions \(cancelled_by\)/);
  });
});

describe('migration 934: every reader skips a cancelled package', () => {
  it('the balance views: no FIFO capacity, no start date, so is_last is the newest live package', () => {
    expect(m934).toMatch(/create or replace view public\.v_package_lessons/);
    expect(m934).toMatch(/create or replace view public\.v_subscription_balance/);
    expect(m934.match(/where s\.student_id = ls\.student_id and s\.status <> 'cancelled'\)/g)).toHaveLength(2);
    expect(m934).toMatch(/from public\.subscriptions s\s+where s\.status <> 'cancelled'\s+window w/);
  });

  it('never a commission: never fully paid, no kind, never an earlier priced package', () => {
    expect(m934).toMatch(/where s\.id = p_subscription and s\.status <> 'cancelled'/);
    expect(m934).toMatch(/when s\.price > 0 and s\.status <> 'cancelled' then/);
    expect(m934).toMatch(/and o\.status <> 'cancelled'\s+and \(o\.created_at, o\.id\) < \(s\.created_at, s\.id\)/);
  });

  it('the family portal never sees it', () => {
    expect(m934).toMatch(/where p\.student_id in \(select public\.portal_student_ids\(\)\) and p\.status <> 'cancelled';/);
  });

  it('backstops: no payment or course rule on a cancelled package; no cancel with money or lessons (23514)', () => {
    expect(m934).toMatch(/before insert or update of subscription_id on public\.payments/);
    expect(m934).toMatch(/before insert or update of subscription_id on public\.schedule_rules/);
    expect(m934).toMatch(/for share;/);
    expect(m934).toMatch(/when \(new\.status = 'cancelled' and old\.status is distinct from 'cancelled'\)/);
    expect(m934).toMatch(/raise exception 'has_payments: subscription %'[^;]+'23514'/);
    expect(m934).toMatch(/l\.status not in \('cancelled_by_teacher', 'cancelled_by_admin'\)/);
    expect(m934).toMatch(/raise exception 'has_lessons: subscription %'[^;]+'23514'/);
    expect(m934).toMatch(/where r\.subscription_id = new\.id and r\.status = 'active'\)/);
    for (const fn of ['refuse_cancelled_subscription', 'subscription_cancel_guard', 'subscription_stays_cancelled', 'payments_frozen_when_cancelled'])
      expect(m934).toContain(`revoke all on function public.${fn}() from public, anon, authenticated;`);
  });

  it('a cancelled package stays cancelled and its payments are frozen', () => {
    expect(m934).toMatch(/when \(old\.status = 'cancelled' and new\.status is distinct from 'cancelled'\)/);
    expect(m934).toMatch(/before update or delete on public\.payments/);
  });
});
