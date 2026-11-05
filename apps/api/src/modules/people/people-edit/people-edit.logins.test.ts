import { describe, expect, it } from 'vitest';
import { AuditService } from '@/common/audit/audit.service';
import { fakeDb, type FakeResult } from '@/modules/people/guardians/fake-db';
import { GuardiansService } from '@/modules/people/guardians';
import { StudentsService } from '@/modules/people/students';
import { PeopleEditRepo } from './people-edit.repo';
import { PeopleEditService } from './people-edit.service';

// #621 review: a new main number would receive the sign-in codes of the family's login AND of
// every child's login (a student's reset and set codes go to guardians.phone_e164).

const GUARDIAN = { id: 'g1', name: 'أم سهيلة', phone_e164: '+201000000001', profile_id: null };
const CHILD = { id: 's1', name: 'سهيلة', contact_is_self: false, profile_id: null };
const NEW_PHONE = { phone_e164: '+201000000009' };

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

/** The family and its children as read; the family row again for the write. */
const shapes = {
  'the family has a login': {
    guardian: { ...GUARDIAN, profile_id: 'p1' },
    children: [CHILD],
    code: 'guardian_has_login',
  },
  'a child has a login (the family never signed in)': {
    guardian: GUARDIAN,
    children: [CHILD, { ...CHILD, id: 's2', profile_id: 'p2' }],
    code: 'student_has_login',
  },
};

describe('PeopleEditService: a family main number and the logins it carries', () => {
  it.each(Object.entries(shapes))('assistant, %s → 409, nothing written', async (_, shape) => {
    const t = setup({
      guardians: [{ data: shape.guardian }],
      students: [{ data: shape.children }],
    });
    const edit = { id: 'g1', patch: NEW_PHONE, actorId: 'u1', admin: false };
    await expect(t.service.editGuardian(edit)).rejects.toMatchObject({
      status: 409,
      response: { code: shape.code },
    });
    expect(t.argsOf('guardians', 'update')).toBeUndefined();
    expect(t.trips).not.toContain('audit_log');
  });

  it.each(Object.entries(shapes))('admin, %s → saved and audited', async (_, shape) => {
    const after = { ...shape.guardian, ...NEW_PHONE };
    const t = setup({
      guardians: [{ data: shape.guardian }, { data: after }],
      audit_log: [{}],
    });
    await t.service.editGuardian({ id: 'g1', patch: NEW_PHONE, actorId: 'u1', admin: true });
    expect(t.argsOf('guardians', 'update')?.[0]).toMatchObject(NEW_PHONE);
    expect(t.argsOf('audit_log', 'insert')?.[0]).toMatchObject({ after: NEW_PHONE });
  });

  it('the assistant: no login anywhere → saved; other fields always save', async () => {
    const free = setup({
      guardians: [{ data: GUARDIAN }, { data: { ...GUARDIAN, ...NEW_PHONE } }],
      students: [{ data: [CHILD] }],
      audit_log: [{}],
    });
    await free.service.editGuardian({ id: 'g1', patch: NEW_PHONE, actorId: 'u1', admin: false });
    expect(free.argsOf('guardians', 'update')?.[0]).toMatchObject(NEW_PHONE);
    const login = { ...GUARDIAN, profile_id: 'p1' };
    const named = setup({ guardians: [{ data: login }, { data: login }], audit_log: [{}] });
    const rename = { id: 'g1', patch: { name: 'أم سهيلة أحمد' }, actorId: 'u1', admin: false };
    await named.service.editGuardian(rename);
    expect(named.argsOf('guardians', 'update')?.[0]).toMatchObject({ name: 'أم سهيلة أحمد' });
    expect(named.trips).not.toContain('students');
  });
});
