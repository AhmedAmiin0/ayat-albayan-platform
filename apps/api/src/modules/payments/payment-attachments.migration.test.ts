import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Migration 20261012000432 (docs/11 §7; rules 8, 9): the database backstop of «المرفقات» — bank transfers
// only, at most 5 per payment (a replay of the same path still ignored), a payment with files stays 'bank'.

const sql = readFileSync(
  join(__dirname, '../../../../../packages/db/supabase/migrations/20261012000432_payment_attachments_backstop.sql'),
  'utf8',
);
const code = sql.replace(/--.*$/gm, '');

describe('migration 20261012000432 payment attachments backstop', () => {
  it('a before-insert trigger on payment_attachments that locks the payment row first', () => {
    expect(code).toMatch(/create trigger payment_attachments_rules before insert on public\.payment_attachments/);
    expect(code).toMatch(/from public\.payments p where p\.id = new\.payment_id for update;/);
  });

  it('refuses a file on a non-bank payment with 23514', () => {
    expect(code).toMatch(/if pay_method is distinct from 'bank' then\s+raise exception [^;]+errcode = '23514'/);
  });

  it('counts only the OTHER paths of the payment against the limit of 5 (an identical replay is ignored)', () => {
    expect(code).toMatch(/a\.payment_id = new\.payment_id and a\.path <> new\.path\) >= 5 then\s+raise exception [^;]+'23514'/);
  });

  it('a payment with files cannot leave bank (before update of method)', () => {
    expect(code).toMatch(/before update of method on public\.payments/);
    expect(code).toMatch(/when \(old\.method = 'bank' and new\.method is distinct from 'bank'\)/);
    expect(code).toMatch(/exists \(select 1 from public\.payment_attachments a where a\.payment_id = new\.id\)/);
    // PaymentsQueries.update maps this message (23514 + "attachments") to 400 attachments_not_allowed.
    expect(code).toMatch(/raise exception 'payment % has attachments[^;]+errcode = '23514'/);
  });

  it('plpgsql with a pinned search_path, never callable by the API roles', () => {
    expect(code.match(/language plpgsql set search_path = '' as/g)?.length).toBe(2);
    expect(code).not.toMatch(/security definer/);
    for (const fn of ['payment_attachment_rules', 'payment_keeps_bank_with_attachments'])
      expect(code).toContain(`revoke all on function public.${fn}() from public, anon, authenticated;`);
  });
});
