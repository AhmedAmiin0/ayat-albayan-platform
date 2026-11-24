import type { PeopleStudentPatch } from '@ab/shared';
import { HttpException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { AuditService } from '@/common/audit/audit.service';
import { errorCode } from '@/common/http/errors';
import { fakeDb, type FakeResult } from '@/common/db/testing/fake-db';
import { GuardiansService } from '@/modules/people/guardians';
import { StudentsService } from '@/modules/people/students';
import { PeopleEditRepo } from './people-edit.repo';
import { PeopleEditService } from './people-edit.service';

// Owner 2026-11-17: a student's own WhatsApp number (a sign-in number), set by staff.

const OWN = '+966500000007';
const STUDENT = { id: 's1', guardian_id: 'g1', name: 'سهيلة', notes: null, profile_id: null };
const RPC = 'rpc:set_student_phone';

function setup(results: Record<string, FakeResult[]>) {
  const fake = fakeDb(results);
  const audit = new AuditService(fake.db);
  const guardians = new GuardiansService(fake.db);
  const students = new StudentsService(fake.db, guardians, audit);
  const service = new PeopleEditService(new PeopleEditRepo(fake.db), students, guardians, audit);
  const edit = (patch: PeopleStudentPatch, admin = false) =>
    service.editStudent({ id: 's1', patch, actorId: 'u1', admin });
  return { ...fake, edit };
}

const statusOf = (e: unknown) => (e instanceof HttpException ? e.getStatus() : 0);
const refusal = (p: Promise<unknown>) =>
  p.then(
    () => 'saved',
    (e: unknown) => [statusOf(e), errorCode(e)],
  );

describe("PeopleEditService: the student's own number", () => {
  it('goes through set_student_phone (audited there), never through the student update', async () => {
    const t = setup({ students: [{ data: STUDENT }], [RPC]: [{ data: true }] });
    await expect(t.edit({ phone_e164: OWN })).resolves.toEqual(STUDENT);
    expect(t.argsOf(RPC, 'rpc')?.[0]).toEqual({ p_student: 's1', p_actor: 'u1', p_phone: OWN });
    expect(t.calls.filter((c) => c.method === 'update' || c.table === 'audit_log')).toEqual([]);
  });

  it('null removes it (no p_phone)', async () => {
    const t = setup({ students: [{ data: STUDENT }], [RPC]: [{ data: true }] });
    await t.edit({ phone_e164: null });
    expect(t.argsOf(RPC, 'rpc')?.[0]).toEqual({ p_student: 's1', p_actor: 'u1' });
  });

  it('the other fields still save and are audited without the number', async () => {
    const after = { ...STUDENT, name: 'سهيلة أحمد' };
    const t = setup({
      students: [{ data: STUDENT }, { data: STUDENT }, { data: after }],
      [RPC]: [{ data: true }],
      audit_log: [{}],
    });
    await t.edit({ name: 'سهيلة أحمد', phone_e164: OWN });
    expect(t.argsOf('students', 'update')?.[0]).not.toHaveProperty('phone_e164');
    expect(t.argsOf('audit_log', 'insert')?.[0]).toMatchObject({
      before: { name: 'سهيلة' },
      after: { name: 'سهيلة أحمد' },
    });
  });

  it('an assistant cannot move the number of a student with a login; the admin can', async () => {
    const login = { ...STUDENT, profile_id: 'p1' };
    const sales = setup({ students: [{ data: login }] });
    expect(await refusal(sales.edit({ phone_e164: OWN }))).toEqual([409, 'student_login_phone']);
    expect(sales.trips).not.toContain(RPC);
    const admin = setup({ students: [{ data: login }], [RPC]: [{ data: true }] });
    await expect(admin.edit({ phone_e164: OWN }, true)).resolves.toEqual(login);
  });

  it('the number is written last: a refused number leaves the other fields saved', async () => {
    const after = { ...STUDENT, name: 'سهيلة أحمد' };
    const error = { code: '23505', message: 'guardian_phones_pkey' };
    const t = setup({
      students: [{ data: STUDENT }, { data: STUDENT }, { data: after }],
      [RPC]: [{ error }],
      audit_log: [{}],
    });
    expect(await refusal(t.edit({ name: 'سهيلة أحمد', phone_e164: OWN }))).toEqual([409, 'phone_taken']);
    const writes = t.calls.filter((c) => c.method === 'update' || c.method === 'rpc');
    expect(writes.map((c) => c.method)).toEqual(['update', 'rpc']);
  });

  it('student_login_phone is said before any field is written', async () => {
    const t = setup({ students: [{ data: { ...STUDENT, profile_id: 'p1' } }] });
    const refused = await refusal(t.edit({ name: 'سهيلة أحمد', phone_e164: OWN }));
    expect(refused).toEqual([409, 'student_login_phone']);
    expect(t.calls.filter((c) => c.method === 'update' || c.method === 'rpc')).toEqual([]);
  });

  it.each([
    [{ code: '23505', message: 'guardian_phones_pkey' }, 409, 'phone_taken'],
    [{ code: 'P0001', message: 'teacher_number' }, 409, 'teacher_number'],
    [{ code: 'P0001', message: 'student_not_found' }, 404, 'student_not_found'],
  ])('a refused number %o answers %s %s', async (error, status, code) => {
    const t = setup({ students: [{ data: STUDENT }], [RPC]: [{ error }] });
    expect(await refusal(t.edit({ phone_e164: OWN }))).toEqual([status, code]);
  });
});
