import type { ReceivableIn } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import { readerOf } from '@/common/settings/settings.fakes';
import type { FxConverter } from '@/modules/reporting/dashboard/finance/fx-converter';
import type { ReceivablesRepo } from './receivables.repo';
import { ReceivablesService } from './receivables.service';
import { ReceivablesSettings } from './receivables.settings';

// A 1000 SAR course stopped: it owes what the stop stored (stop_owed_amount, owner 2026-11-06).
const stopped = (id: string, owed: number | null): ReceivableIn => ({
  id,
  student: { id: `s-${id}`, code: 'AB-0001', name: id },
  guardian: null,
  price: 1000,
  currency: 'SAR',
  starts_on: '2026-09-01',
  status: 'cancelled',
  cancel_kind: 'stopped',
  stop_owed_amount: owed,
});

async function owedOf(pkgs: ReceivableIn[], netPaid: [string, number][], rate = 100) {
  const queries = {
    packages: vi.fn().mockResolvedValue(pkgs),
    paid: vi.fn().mockResolvedValue(new Map(netPaid)),
  };
  const sar = { currency: 'SAR', rates: { SAR: 1 }, missing: [], date: null };
  const fx = { conversion: vi.fn().mockResolvedValue(sar) };
  const settings = readerOf(ReceivablesSettings, { refund_attended_rate_percent: rate });
  const repo = queries as unknown as ReceivablesRepo;
  const svc = new ReceivablesService(repo, fx as unknown as FxConverter, settings);
  const view = await svc.list(new Date('2026-10-05T09:00:00Z'));
  return { rows: view.rows.map((r) => [r.id, r.owed]), total: view.total };
}

describe('GET /receivables: a stopped course owes its stored decision', () => {
  it('after any refund (owed = net paid after it): not listed, the KPI total 0', async () => {
    expect(await owedOf([stopped('full', 0)], [['full', 0]])).toEqual({ rows: [], total: 0 });
    expect((await owedOf([stopped('part', 600)], [['part', 600]])).rows).toEqual([]);
  });

  it('a plain stop owes the chosen amount minus net paid', async () => {
    expect(await owedOf([stopped('att', 300)], [['att', 100]])).toEqual({
      rows: [['att', 200]],
      total: 200,
    });
    expect((await owedOf([stopped('none', 0)], [])).rows).toEqual([]);
  });

  it('an old stop (backfilled with its price) owes as it did before #623', async () => {
    expect((await owedOf([stopped('old', 1000)], [['old', 400]])).rows).toEqual([['old', 600]]);
  });

  it('a settings rate change never changes an existing stop’s due', async () => {
    const at = (rate: number) => owedOf([stopped('s', 300)], [['s', 100]], rate);
    expect(await at(50)).toEqual(await at(300));
    expect((await at(50)).rows).toEqual([['s', 200]]);
  });

  it('a running package still owes its price', async () => {
    const running = { ...stopped('run', null), status: 'unpaid', cancel_kind: null };
    expect((await owedOf([running], [])).rows).toEqual([['run', 1000]]);
  });
});
