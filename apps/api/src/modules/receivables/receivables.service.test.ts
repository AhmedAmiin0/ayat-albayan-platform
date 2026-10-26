import { describe, expect, it, vi } from 'vitest';
import { readerOf } from '../../common/settings/settings.fakes';
import type { FxConverter } from '../dashboard/finance/fx-converter';
import type { ReceivablesQueries } from './receivables.queries';
import { ReceivablesService } from './receivables.service';
import { ReceivablesSettings } from './receivables.settings';

const pkg = (id: string, currency: string, price: number) => ({
  id,
  student: { id: `s-${id}`, code: 'AB-0001', name: id },
  guardian: null,
  price,
  currency,
  starts_on: '2026-09-01',
  status: 'unpaid',
});

describe('ReceivablesService (GET /receivables)', () => {
  it('owed per package, totals per currency and one total in the reporting currency', async () => {
    const queries = {
      packages: vi.fn().mockResolvedValue([pkg('a', 'SAR', 450), pkg('b', 'EGP', 1300), pkg('c', 'AED', 100), pkg('d', 'SAR', 100)]),
      paid: vi.fn().mockResolvedValue(new Map([['a', 150], ['d', 100]])),
    };
    const fx = {
      conversion: vi.fn().mockResolvedValue({ currency: 'SAR', rates: { SAR: 1, EGP: 13 }, missing: ['AED'], date: null }),
    };
    const svc = new ReceivablesService(
      queries as unknown as ReceivablesQueries,
      fx as unknown as FxConverter,
      readerOf(ReceivablesSettings),
    );
    const v = await svc.list(new Date('2026-10-05T09:00:00Z'));
    expect(v.rows.map((r) => [r.id, r.owed, r.days_overdue])).toEqual([
      ['a', 300, 34],
      ['b', 1300, 34],
      ['c', 100, 34],
    ]);
    expect(queries.paid).toHaveBeenCalledWith(['a', 'b', 'c', 'd']);
    expect(fx.conversion).toHaveBeenCalledWith('SAR', ['AED', 'EGP', 'SAR']); // settings.reporting_currency
    expect(v.total).toBe(400); // 300 SAR + 1300 EGP / 13; AED has no rate
    expect(v.fx_missing).toEqual(['AED']);
    expect(v.totals.map((t) => t.currency)).toEqual(['AED', 'EGP', 'SAR']);
  });
});
