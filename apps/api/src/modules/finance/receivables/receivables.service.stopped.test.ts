import { describe, expect, it, vi } from 'vitest';
import { readerOf } from '@/common/settings/settings.fakes';
import type { FxConverter } from '@/modules/reporting/dashboard/finance/fx-converter';
import type { ReceivablesRepo } from './receivables.repo';
import { ReceivablesService } from './receivables.service';
import { ReceivablesSettings } from './receivables.settings';
import type { ReceivablePkg } from './receivables.stopped';

// A course of 10 lessons for 1000 SAR stopped after 3 (lessons_used_at_stop): attended value 300.
const stopped = (id: string, attended = 3): ReceivablePkg => ({
  id,
  student: { id: `s-${id}`, code: 'AB-0001', name: id },
  guardian: null,
  price: 1000,
  currency: 'SAR',
  starts_on: '2026-09-01',
  status: 'cancelled',
  stop: { lessonsTotal: 10, attended },
});

async function owedOf(pkgs: ReceivablePkg[], netPaid: [string, number][], rate = 100) {
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

describe('GET /receivables: a stopped course («إلغاء مع استرداد») never owes its refund', () => {
  it('full refund (paid 1000, refunded 700): not listed, the KPI total 0', async () => {
    expect(await owedOf([stopped('full')], [['full', 300]])).toEqual({ rows: [], total: 0 });
  });

  it('partial refund (paid 1000, refunded 400): not listed', async () => {
    expect((await owedOf([stopped('part')], [['part', 600]])).rows).toEqual([]);
  });

  it('a refund of 0 (paid exactly the 300 attended): not listed', async () => {
    expect((await owedOf([stopped('zero')], [['zero', 300]])).rows).toEqual([]);
  });

  it('nothing attended, fully refunded (net paid 0): not listed', async () => {
    expect((await owedOf([stopped('none', 0)], [['none', 0]])).rows).toEqual([]);
  });

  it('a stop with no refund and nothing paid owes the attended value, not the price', async () => {
    expect(await owedOf([stopped('unpaid')], [])).toEqual({ rows: [['unpaid', 300]], total: 300 });
  });

  it('owes at the attended-lesson rate setting; a running package still owes its price', async () => {
    const running = { ...stopped('run'), status: 'unpaid', stop: null };
    const out = await owedOf([stopped('half'), running], [['half', 100]], 50);
    expect(out.rows).toEqual([
      ['half', 50],
      ['run', 1000],
    ]);
  });
});
