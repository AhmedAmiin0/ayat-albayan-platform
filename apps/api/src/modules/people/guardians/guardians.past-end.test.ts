import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { pastEnd, rangesOn } from '@/common/db/testing/past-end';
import { GuardiansService } from './guardians.service';

describe('GuardiansService.list past the last page', () => {
  it('answers an empty page with the real total, newest first then id', async () => {
    const fake = fakeDb({ guardians: pastEnd(41) });
    const page = await new GuardiansService(fake.db).list({ search: '', page: 4, pageSize: 20 });
    expect(page).toEqual({ items: [], total: 41, page: 4, pageSize: 20 });
    expect(rangesOn(fake, 'guardians')).toEqual([[60, 79], [0, 0]]);
    const orders = fake.calls.filter((c) => c.method === 'order').map((c) => c.args);
    expect(orders.slice(0, 2)).toEqual([
      ['created_at', { ascending: false }],
      ['id', { ascending: true }],
    ]);
  });

  it('reads the family numbers once, not again for the count', async () => {
    const fake = fakeDb({ guardian_phones: [{ data: [{ guardian_id: 'g1' }] }], guardians: pastEnd(1) });
    await new GuardiansService(fake.db).list({ search: '0501234567', page: 2, pageSize: 20 });
    expect(fake.trips).toEqual(['guardian_phones', 'guardians', 'guardians']);
  });
});
