import { describe, expect, it } from 'vitest';
import { fakeDb } from '../../modules/people/guardians/fake-db';
import { familyOfPhone } from './family-of-phone';

const FAMILY = { id: 'g1', name: 'أم سهيلة', tz: 'Asia/Riyadh', phone_e164: '+966551110000' };

describe('familyOfPhone (one number = one family, main or second)', () => {
  it('reads guardian_phones by the exact number and returns the family with its MAIN number', async () => {
    const f = fakeDb({ guardian_phones: [{ data: { guardian: FAMILY } }] });
    expect(await familyOfPhone(f.db, '+966552220000')).toEqual(FAMILY);
    expect(f.argsOf('guardian_phones', 'eq')).toEqual(['phone_e164', '+966552220000']);
    expect(f.argsOf('guardian_phones', 'select')).toEqual(['guardian:guardians!inner(id, name, tz, phone_e164)']);
    expect(f.trips).toEqual(['guardian_phones']);
  });

  it('a lead, a teacher or an unknown number → null', async () => {
    expect(await familyOfPhone(fakeDb({ guardian_phones: [{ data: null }] }).db, '+966559990000')).toBeNull();
  });

  it('a database error is thrown', async () => {
    const f = fakeDb({ guardian_phones: [{ error: { message: 'boom' } }] });
    await expect(familyOfPhone(f.db, '+966559990000')).rejects.toThrow(/boom/);
  });
});
