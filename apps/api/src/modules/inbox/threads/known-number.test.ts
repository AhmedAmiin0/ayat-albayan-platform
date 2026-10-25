import { describe, expect, it } from 'vitest';
import { fakeDb } from '../../guardians/fake-db';
import { knownNumber } from './known-number';

const PHONE = '+966501234567';

describe('knownNumber (a number with no message yet)', () => {
  it('a guardian (and its lead) by phone: what the people panel and the next lessons need', async () => {
    const f = fakeDb({
      guardians: [{ data: [{ id: 'g1', name: 'أم سهيلة', tz: 'Asia/Riyadh' }] }],
      leads: [{ data: [{ id: 'l1', status: 'converted' }] }],
      teachers: [{ data: [] }],
    });
    expect(await knownNumber(f.db, PHONE)).toEqual({
      guardian_id: 'g1', guardian_name: 'أم سهيلة', guardian_tz: 'Asia/Riyadh', lead_id: 'l1', lead_status: 'converted', teacher_id: null,
    });
    expect(f.argsOf('guardians', 'eq')).toEqual(['phone_e164', PHONE]);
    expect(f.argsOf('guardians', 'select')).toEqual(['id, name, tz']);
  });

  it('a teacher alone; nobody → null', async () => {
    const teacher = fakeDb({ guardians: [{ data: [] }], leads: [{ data: [] }], teachers: [{ data: [{ id: 't1' }] }] });
    expect(await knownNumber(teacher.db, PHONE)).toMatchObject({ guardian_id: null, teacher_id: 't1' });
    const nobody = fakeDb({ guardians: [{ data: [] }], leads: [{ data: [] }], teachers: [{ data: [] }] });
    expect(await knownNumber(nobody.db, PHONE)).toBeNull();
  });

  it('a database error becomes an error', async () => {
    const f = fakeDb({ guardians: [{ error: { message: 'boom' } }], leads: [{ data: [] }], teachers: [{ data: [] }] });
    await expect(knownNumber(f.db, PHONE)).rejects.toThrow(/boom/);
  });
});
