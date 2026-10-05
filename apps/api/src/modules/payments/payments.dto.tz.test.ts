import { describe, expect, it } from 'vitest';
import { recentFilter } from '../invoices/invoices.dto';
import { utcWindow } from './payments.dto';

describe('date ranges follow settings.academy_timezone (docs/11 §3)', () => {
  it('Riyadh by default: a local day starts 21:00 UTC the day before', () => {
    expect(utcWindow({ from: '2026-12-01', to: '2026-12-01' })).toEqual({
      from: '2026-11-30T21:00:00.000Z',
      to: '2026-12-01T21:00:00.000Z',
    });
  });

  it('Cairo when the academy zone is changed', () => {
    expect(utcWindow({ from: '2026-12-01' }, 'Africa/Cairo')).toEqual({ from: '2026-11-30T22:00:00.000Z' });
    const q = { page: 1, pageSize: 20, from: '2026-12-01', sort: undefined, dir: undefined } as Parameters<typeof recentFilter>[0];
    expect(recentFilter(q, 'Africa/Cairo').from).toBe('2026-11-30T22:00:00.000Z');
  });
});
