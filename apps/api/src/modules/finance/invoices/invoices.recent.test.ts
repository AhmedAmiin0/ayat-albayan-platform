import { describe, expect, it, vi } from 'vitest';
import type { StorageService } from '../../../common/storage/storage.service';
import type { InvoicesQueries } from './invoices.queries';
import { InvoicesService } from './invoices.service';

const row = (id: string) => ({
  id,
  rule_id: null,
  kind: 'package' as const,
  storage_path: `r/${id}.png`,
  mime: 'image/png',
  size_bytes: 10,
  source: 'upload' as const,
  created_at: '2026-10-01T09:00:00Z',
  students: [{ id: 's1', name: 'سهيلة', code: 'AB-0183' }],
});

describe('InvoicesService.recent (the admin invoices page)', () => {
  it('pages the invoices newest first and marks the ones already recorded as a payment', async () => {
    const queries = {
      recent: vi.fn().mockResolvedValue({ rows: [row('i1'), row('i2')], total: 2 }),
      paymentsOf: vi.fn().mockResolvedValue(new Map([['i2', 'p9']])),
    };
    const svc = new InvoicesService(queries as unknown as InvoicesQueries, {} as StorageService);
    const page = await svc.recent({ page: 1, pageSize: 25 });
    expect(queries.paymentsOf).toHaveBeenCalledWith(['i1', 'i2']);
    expect(page.items.map((i) => [i.id, i.payment_id])).toEqual([
      ['i1', null],
      ['i2', 'p9'],
    ]);
    expect(page.items[0]).not.toHaveProperty('storage_path');
    expect(page.total).toBe(2);
  });
});
