import { describe, expect, it } from 'vitest';
import { fakeDb } from '../../people/guardians/fake-db';
import { RatingQueries } from './rating.queries';

describe('RatingQueries.guardianByPhone («إرسال تقييم الحلقة» from a family chat)', () => {
  it('a family’s second number is that family, with its main number and tz', async () => {
    const family = { id: 'g1', name: 'أم سهيلة', tz: 'Asia/Riyadh', phone_e164: '+966551110000' };
    const t = fakeDb({ guardian_phones: [{ data: { guardian: family } }] });
    expect(await new RatingQueries(t.db).guardianByPhone('+966552220000')).toEqual({ id: 'g1', phone_e164: '+966551110000', tz: 'Asia/Riyadh' });
    expect(t.argsOf('guardian_phones', 'eq')).toEqual(['phone_e164', '+966552220000']);
  });

  it('a lead or an unknown number → null', async () => {
    expect(await new RatingQueries(fakeDb({ guardian_phones: [{ data: null }] }).db).guardianByPhone('+966559990000')).toBeNull();
  });
});
