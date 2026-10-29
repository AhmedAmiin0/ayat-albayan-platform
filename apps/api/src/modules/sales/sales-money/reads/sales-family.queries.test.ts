import { describe, expect, it } from 'vitest';
import { fakeDb } from '../../../people/guardians/fake-db';
import { SalesFamilyQueries } from './sales-family.queries';

describe('SalesFamilyQueries', () => {
  it('studentsOfPhone: the children of the family of the chat number (main or second), oldest first', async () => {
    const family = { id: 'g1', name: 'أم سهيلة', tz: 'Asia/Riyadh', phone_e164: '+966551110000' };
    const t = fakeDb({
      guardian_phones: [{ data: { guardian: family } }],
      students: [{ data: [{ id: 's1', code: 'AB-1', name: 'س', status: 'trial', teacher_id: null }] }],
    });
    const rows = await new SalesFamilyQueries(t.db).studentsOfPhone('+966552220000');
    expect(rows).toEqual([{ id: 's1', code: 'AB-1', name: 'س', status: 'trial', teacher_id: null }]);
    expect(t.argsOf('guardian_phones', 'eq')).toEqual(['phone_e164', '+966552220000']);
    expect(t.argsOf('students', 'eq')).toEqual(['guardian_id', 'g1']);
  });

  it('studentsOfPhone: a lead or an unknown number → [] without reading students', async () => {
    const t = fakeDb({ guardian_phones: [{ data: null }] });
    expect(await new SalesFamilyQueries(t.db).studentsOfPhone('+966559990000')).toEqual([]);
    expect(t.trips).toEqual(['guardian_phones']);
  });

  it('phonesOf: every number of the student’s family; [] for an unknown student', async () => {
    const phones = [{ phone_e164: '+966551110000' }, { phone_e164: '+966552220000' }];
    const t = fakeDb({ students: [{ data: { guardian: { phones } } }, { data: null }] });
    const q = new SalesFamilyQueries(t.db);
    expect(await q.phonesOf('s1')).toEqual(['+966551110000', '+966552220000']);
    expect(t.argsOf('students', 'eq')).toEqual(['id', 's1']);
    expect(await q.phonesOf('x')).toEqual([]);
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
