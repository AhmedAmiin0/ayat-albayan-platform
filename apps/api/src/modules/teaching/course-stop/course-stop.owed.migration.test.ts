import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Migrations 20261106000100 / 101 (owner 2026-11-06): what the SQL spec
// (e2e/tests/teaching/course-stop-owed.sql.spec.ts) proves against the database, pinned here.
const dir = join(__dirname, '../../../../../../packages/db/supabase/migrations');
const read = (name: string) => readFileSync(join(dir, name), 'utf8').replace(/--.*$/gm, '');
const owed = read('20261106000100_stop_owed_amount.sql');
const keeps = read('20261106000101_stop_keeps_commission.sql');
const backfill = owed.slice(owed.indexOf('update public.subscriptions s'), owed.indexOf('create or replace'));

describe('20261106000100: the stop stores what it is owed for', () => {
  it('backfills ONLY stopped rows with nothing stored, with the price (old stops unchanged)', () => {
    expect(backfill).toMatch(/where s\.cancel_kind = 'stopped' and s\.stop_owed_amount is null/);
    expect(backfill).toMatch(/else s\.price end/);
    expect(backfill).toMatch(/stop_owed_choice = 'legacy'/);
    expect(backfill).not.toMatch(/\bstatus\s*=/);
  });

  it('a stop already followed by a refund owes the net paid after it, never the refund', () => {
    expect(backfill).toMatch(/r\.paid_at >= date_trunc\('second', s\.cancelled_at\)/);
    expect(backfill).toMatch(/greatest\(0, coalesce\(\(select sum\(case when p\.kind = 'refund' then -p\.amount/);
  });

  it('stop_course writes the decision in the stop’s own update and audit row', () => {
    const fn = owed.slice(owed.indexOf('function public.stop_course('));
    expect(fn).toMatch(/stop_owed_amount = coalesce\(v_owed, s\.price\), stop_owed_choice = /);
    expect(fn).toMatch(/'owed_amount', coalesce\(v_owed, s\.price\)/);
    expect(fn).toMatch(/if v_owed < 0 then/);
    // A retry with another decision never runs against the stored one.
    expect(fn).toMatch(/raise exception 'stop_mismatch'/);
    expect(owed).toContain('revoke execute on function public.stop_course(jsonb) from public, anon, authenticated');
  });

  it('never reads a settings rate (a later change cannot rewrite a stop)', () => {
    expect(owed).not.toMatch(/refund_attended_rate_percent/);
  });
});

describe('20261106000101: a stop keeps the commission', () => {
  it('an earned row on a stopped package is kept; the fully-paid guard stays for the rest', () => {
    const settle = keeps.slice(keeps.indexOf('function public.settle_assistant_commission('));
    expect(settle).toMatch(
      /public\.subscription_full_at\(c\.subscription_id\) is not null\s+or public\.subscription_stopped\(c\.subscription_id\)\)/,
    );
    expect(settle).toContain("perform public.void_assistant_commission_row(c.id, 'payment_voided', true, null);");
  });

  it('deploy changes no row: function bodies only', () => {
    const outside = keeps.replace(/\$\$[\s\S]*?\$\$/g, '');
    expect(outside).not.toMatch(/\b(update|insert into|delete from|select public\.)/i);
    expect(keeps).toMatch(/s\.status = 'cancelled' and s\.cancel_kind = 'stopped'/);
  });
});
