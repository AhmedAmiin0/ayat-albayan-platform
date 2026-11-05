import { describe, expect, it } from 'vitest';
import { AuditService } from '@/common/audit/audit.service';
import { fakeDb, type FakeResult } from '@/modules/people/guardians/fake-db';
import { GuardiansService } from '@/modules/people/guardians';
import { StudentsService } from '@/modules/people/students';
import { PeopleEditRepo } from './people-edit.repo';
import { PeopleEditService } from './people-edit.service';

const STUDENT = {
  id: 's1',
  guardian_id: 'g1',
  name: 'سهيلة',
  notes: null,
  status: 'active',
  tz: 'Africa/Cairo',
};
const GUARDIAN = {
  id: 'g1',
  name: 'أم سهيلة',
  phone_e164: '+201000000001',
  tz: 'Africa/Cairo',
  notes: null,
};

function setup(results: Record<string, FakeResult[]>) {
  const fake = fakeDb(results);
  const audit = new AuditService(fake.db);
  const guardians = new GuardiansService(fake.db);
  const service = new PeopleEditService(
    new PeopleEditRepo(fake.db),
    new StudentsService(fake.db, guardians, audit),
    guardians,
    audit,
  );
  return { ...fake, service };
}

describe('PeopleEditService «تعديل البيانات»', () => {
  it('writes the student through the admin update and audits the named fields only', async () => {
    const after = { ...STUDENT, name: 'سهيلة أحمد', notes: 'جديدة' };
    const t = setup({
      students: [{ data: STUDENT }, { data: STUDENT }, { data: after }],
      audit_log: [{}],
    });
    await expect(
      t.service.editStudent({
        id: 's1',
        patch: { name: 'سهيلة أحمد', notes: 'جديدة' },
        actorId: 'u1',
      }),
    ).resolves.toEqual(after);
    expect(t.argsOf('students', 'update')?.[0]).toMatchObject({
      name: 'سهيلة أحمد',
      notes: 'جديدة',
      name_normalized: expect.any(String),
    });
    expect(t.argsOf('audit_log', 'insert')?.[0]).toEqual({
      actor_id: 'u1',
      entity: 'students',
      entity_id: 's1',
      action: 'people_edit',
      before: { name: 'سهيلة', notes: null },
      after: { name: 'سهيلة أحمد', notes: 'جديدة' },
    });
    expect(t.trips).not.toContain('subscriptions');
  });

  it('an empty body writes and audits nothing; an unknown student → 404 student_not_found', async () => {
    const t = setup({ students: [{ data: STUDENT }, { data: null }] });
    await expect(t.service.editStudent({ id: 's1', patch: {}, actorId: 'u1' })).resolves.toEqual(
      STUDENT,
    );
    await expect(
      t.service.editStudent({ id: 'x', patch: { name: 'x' }, actorId: 'u1' }),
    ).rejects.toMatchObject({ response: { code: 'student_not_found' } });
    expect(t.calls.filter((c) => c.method === 'update' || c.method === 'insert')).toEqual([]);
  });

  it('writes the family and audits it; a taken phone → 409 { code: phone_taken }, no audit', async () => {
    const after = { ...GUARDIAN, phone_e164: '+201000000009' };
    const t = setup({ guardians: [{ data: GUARDIAN }, { data: after }], audit_log: [{}] });
    await t.service.editGuardian({
      id: 'g1',
      patch: { phone_e164: '+201000000009' },
      actorId: 'u1',
      admin: false,
    });
    expect(t.argsOf('audit_log', 'insert')?.[0]).toMatchObject({
      entity: 'guardians',
      action: 'people_edit',
      before: { phone_e164: '+201000000001' },
      after: { phone_e164: '+201000000009' },
    });
    const taken = setup({
      guardians: [
        { data: GUARDIAN },
        { error: { code: '23505', message: 'guardian_phones_pkey' } },
      ],
    });
    await expect(
      taken.service.editGuardian({
        id: 'g1',
        patch: { phone_e164: '+201000000009' },
        actorId: 'u1',
        admin: false,
      }),
    ).rejects.toMatchObject({
      status: 409,
      response: { code: 'phone_taken' },
    });
    expect(taken.trips).not.toContain('audit_log');
  });
});
