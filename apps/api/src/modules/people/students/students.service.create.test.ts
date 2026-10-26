import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../../../common/audit/audit.service';
import { fakeDb, type FakeResult } from '../guardians/fake-db';
import { GuardiansService } from '../guardians/guardians.service';
import type { StudentCreateRequest } from './students.dto';
import { StudentsService } from './students.service';

const G = { id: 'g1', name: 'ام جود', phone_e164: '+966501234567' };
const SUHAILA = { id: 's1', code: 'AB-0183', name: 'سهيلة', status: 'trial' };
const NEW = { id: 's2', code: 'AB-0184', name: 'سهيله' };
const BASE = { name: 'سهيله', tz: 'Asia/Riyadh', program: 'quran', status: 'trial', force: false } as const;
const WITH_PHONE: StudentCreateRequest = {
  ...BASE,
  guardian: { name: 'ام جود', phone_e164: '+966501234567', tz: 'Asia/Riyadh' },
};

function setup(results: Record<string, FakeResult[]>) {
  const fake = fakeDb(results);
  const audit = { record: vi.fn() } as unknown as AuditService;
  return { ...fake, svc: new StudentsService(fake.db, new GuardiansService(fake.db), audit) };
}

const err = async (p: Promise<unknown>) => p.then(() => expect.unreachable(), (e: unknown) => e);

describe('StudentsService.create (R-STU-02, R-STU-03, R-STU-04)', () => {
  it('new phone: creates the guardian, then the student under it', async () => {
    const { svc, argsOf } = setup({
      guardians: [{ data: null }, { data: G }, { data: { ...G, students: [] } }],
      students: [{ data: NEW }],
    });
    await expect(svc.create(WITH_PHONE, 'u1')).resolves.toEqual(NEW);
    expect(argsOf('guardians', 'insert')).toEqual([{ ...WITH_PHONE.guardian, country: 'SA', created_by: 'u1' }]);
    expect(argsOf('students', 'insert')).toEqual([
      expect.objectContaining({ guardian_id: 'g1', name_normalized: 'سهيله', created_by: 'u1' }),
    ]);
  });

  it('same phone + similar name → 409 duplicate_student with candidates, nothing inserted', async () => {
    const { svc, calls } = setup({ guardians: [{ data: G }, { data: { ...G, students: [SUHAILA] } }] });
    const e = await err(svc.create(WITH_PHONE, 'u1'));
    expect(e).toBeInstanceOf(ConflictException);
    expect((e as ConflictException).getResponse()).toEqual({
      message: 'duplicate_student',
      guardian_id: 'g1',
      candidates: [SUHAILA],
    });
    expect(calls.some((c) => c.method === 'insert')).toBe(false);
  });

  it('same phone, different name (a sibling) is created under the existing guardian', async () => {
    const { svc, argsOf } = setup({
      guardians: [{ data: G }, { data: { ...G, students: [SUHAILA] } }],
      students: [{ data: { ...NEW, name: 'جودي' } }],
    });
    await svc.create({ ...WITH_PHONE, name: 'جودي' }, 'u1');
    expect(argsOf('guardians', 'insert')).toBeUndefined();
    expect(argsOf('students', 'insert')).toEqual([expect.objectContaining({ guardian_id: 'g1', name: 'جودي' })]);
  });

  it('force: true skips the duplicate check', async () => {
    const { svc, calls } = setup({ guardians: [{ data: G }], students: [{ data: NEW }] });
    await expect(svc.create({ ...WITH_PHONE, force: true }, 'u1')).resolves.toEqual(NEW);
    expect(calls.filter((c) => c.table === 'guardians' && c.method === 'select')).toHaveLength(1);
  });

  it('guardian_id: checks that guardian’s students and inserts', async () => {
    const { svc, argsOf } = setup({
      guardians: [{ data: { ...G, students: [] } }],
      students: [{ data: NEW }],
    });
    await svc.create({ ...BASE, guardian_id: 'g1' }, 'u1');
    expect(argsOf('guardians', 'eq')).toEqual(['id', 'g1']);
    expect(argsOf('students', 'insert')).toEqual([expect.objectContaining({ guardian_id: 'g1' })]);
  });
});
