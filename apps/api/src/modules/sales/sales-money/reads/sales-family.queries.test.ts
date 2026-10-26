import { describe, expect, it } from 'vitest';
import { fakeDb } from '../../../people/guardians/fake-db';
import { SalesFamilyQueries } from './sales-family.queries';

describe('SalesFamilyQueries', () => {
  it('studentsOfPhone: the guardian’s children by the chat phone, without the join columns', async () => {
    const t = fakeDb({ students: [{ data: [{ id: 's1', code: 'AB-1', name: 'س', status: 'trial', guardian: { phone_e164: '+966551110000' } }] }] });
    const rows = await new SalesFamilyQueries(t.db).studentsOfPhone('+966551110000');
    expect(rows).toEqual([{ id: 's1', code: 'AB-1', name: 'س', status: 'trial' }]);
    expect(t.argsOf('students', 'eq')).toEqual(['guardian.phone_e164', '+966551110000']);
  });

  it('familyPhone: 404 for an unknown student', async () => {
    const t = fakeDb({ students: [{ data: null }, { data: { guardian: { phone_e164: '+966551110000' } } }] });
    const q = new SalesFamilyQueries(t.db);
    await expect(q.familyPhone('x')).rejects.toThrow();
    expect(await q.familyPhone('s1')).toBe('+966551110000');
  });

  it('studentStatus: the status right now; 404 when missing', async () => {
    const t = fakeDb({ students: [{ data: { status: 'active' } }, { data: null }] });
    const q = new SalesFamilyQueries(t.db);
    expect(await q.studentStatus('s1')).toBe('active');
    await expect(q.studentStatus('x')).rejects.toThrow();
  });
});
