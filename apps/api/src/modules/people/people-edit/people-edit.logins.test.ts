import { describe, expect, it } from 'vitest';
import { AuditService } from '@/common/audit/audit.service';
import { fakeDb, type FakeResult } from '@/modules/people/guardians/fake-db';
import { GuardiansService } from '@/modules/people/guardians';
import { StudentsService } from '@/modules/people/students';
import { PeopleEditRepo } from './people-edit.repo';
import { PeopleEditService } from './people-edit.service';

const FAMILY = { id: 'g1', name: 'أم سهيلة', phone_e164: '+201000000001', tz: 'Africa/Cairo' };
const NEW_NUMBER = { phone_e164: '+201000000009' };

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

/** The family row (with or without its own login) and how many children have a login. */
const family = (opts: { login: boolean; childLogins: number }) => {
  const row = { ...FAMILY, profile_id: opts.login ? 'p-guardian' : null };
  return setup({
    guardians: [{ data: row }, { data: { ...row, ...NEW_NUMBER } }],
    students: [{ count: opts.childLogins }],
    audit_log: [{}],
  });
};

const edit = (admin: boolean, patch: object = NEW_NUMBER) => ({
  id: 'g1',
  patch,
  actorId: 'u1',
  admin,
});

// Merge gate #1: a child's password reset / set code goes to guardians.phone_e164
// (PasswordTargets.student), so a new main number would take that child's login over.
describe('PeopleEditService: the main number of a family with a login', () => {
  it.each([
    { case: 'the guardian’s own login', login: true, childLogins: 0, code: 'guardian_has_login' },
    { case: 'a child’s login', login: false, childLogins: 1, code: 'family_has_login' },
  ])('assistant, $case → 409 $code, nothing written', async ({ login, childLogins, code }) => {
    const t = family({ login, childLogins });
    await expect(t.service.editGuardian(edit(false))).rejects.toMatchObject({
      status: 409,
      response: { code },
    });
    expect(t.argsOf('guardians', 'update')).toBeUndefined();
    expect(t.trips).not.toContain('audit_log');
  });

  it('the child check reads the family’s children that have a login', async () => {
    const t = family({ login: false, childLogins: 1 });
    await expect(t.service.editGuardian(edit(false))).rejects.toThrow();
    const on = t.calls.filter((c) => c.table === 'students').map((c) => [c.method, ...c.args]);
    expect(on).toEqual(
      expect.arrayContaining([
        ['eq', 'guardian_id', 'g1'],
        ['not', 'profile_id', 'is', null],
      ]),
    );
  });

  it.each([
    { case: 'the guardian’s own login', login: true, childLogins: 0 },
    { case: 'a child’s login', login: false, childLogins: 1 },
  ])('admin, $case → the number changes, audited', async ({ login, childLogins }) => {
    const t = family({ login, childLogins });
    await t.service.editGuardian(edit(true));
    expect(t.argsOf('guardians', 'update')?.[0]).toMatchObject(NEW_NUMBER);
    expect(t.argsOf('audit_log', 'insert')?.[0]).toMatchObject({
      action: 'people_edit',
      before: { phone_e164: FAMILY.phone_e164 },
      after: NEW_NUMBER,
    });
  });

  it('assistant: no login anywhere → the number changes; other fields never check logins', async () => {
    const t = family({ login: false, childLogins: 0 });
    await t.service.editGuardian(edit(false));
    expect(t.argsOf('guardians', 'update')?.[0]).toMatchObject(NEW_NUMBER);
    const named = family({ login: true, childLogins: 1 });
    await named.service.editGuardian(edit(false, { name: 'أم خالد' }));
    expect(named.argsOf('guardians', 'update')?.[0]).toMatchObject({ name: 'أم خالد' });
    expect(named.trips).not.toContain('students');
  });
});
