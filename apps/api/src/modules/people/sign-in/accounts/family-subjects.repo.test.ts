import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { familyByPhone } from './family-subjects.repo';

const MAIN = '+966500000001';
const OWN = '+966500000007';
const guardian = { id: 'g1', name: 'ولي الأمر', phone_e164: MAIN, tz: 'Asia/Riyadh', profile_id: null };
const student = { id: 's1', name: 'الطالب', tz: 'Africa/Cairo', profile_id: 'p-s1' };

describe('familyByPhone (owner 2026-11-17): any family number in guardian_phones', () => {
  it('reads guardian_phones by the number, with the family and the student it belongs to', async () => {
    const { db, argsOf } = fakeDb({ guardian_phones: [{ data: null }] });
    await expect(familyByPhone(db, OWN)).resolves.toBeNull();
    expect(argsOf('guardian_phones', 'eq')).toEqual(['phone_e164', OWN]);
    const columns = String(argsOf('guardian_phones', 'select')?.[0]);
    expect(columns).toContain('guardian:guardians!inner(id, name, phone_e164, tz, profile_id)');
    expect(columns).toContain('student:students!guardian_phones_student_id_fkey(');
  });

  it('a main or second number opens the guardian (the record keeps the MAIN number)', async () => {
    const row = { phone_e164: '+966500000006', guardian, student: null };
    const { db } = fakeDb({ guardian_phones: [{ data: row }] });
    await expect(familyByPhone(db, row.phone_e164)).resolves.toEqual({
      kind: 'guardian',
      phone: '+966500000006',
      rec: { id: 'g1', name: 'ولي الأمر', phone: MAIN, tz: 'Asia/Riyadh', profileId: null },
    });
  });

  it("a student's own number opens the student (the code goes to that number)", async () => {
    const { db } = fakeDb({ guardian_phones: [{ data: { phone_e164: OWN, guardian, student } }] });
    await expect(familyByPhone(db, OWN)).resolves.toEqual({
      kind: 'student',
      phone: OWN,
      rec: { id: 's1', name: 'الطالب', tz: 'Africa/Cairo', profileId: 'p-s1', guardianPhone: MAIN },
    });
  });

  it('a database error is thrown', async () => {
    const { db } = fakeDb({ guardian_phones: [{ error: { message: 'boom' } }] });
    await expect(familyByPhone(db, OWN)).rejects.toThrow();
  });
});
