import { describe, expect, it } from 'vitest';
import { AuditService } from '@/common/audit/audit.service';
import { fakeDb, type FakeResult } from '@/modules/people/guardians/fake-db';
import { GuardiansService } from '@/modules/people/guardians';
import { FamilyMoveService } from './family-move.service';
import { FamilySearchRepo } from './family-search.repo';
import { PeopleEditRepo } from './people-edit.repo';

/** The ownership rule off: every family is hers. */
const owns = (): Promise<void> => Promise.resolve();
const STUDENT = { id: 's1', guardian_id: 'g-old', contact_is_self: false, profile_id: null };

function setup(results: Record<string, FakeResult[]>) {
  const fake = fakeDb(results);
  const service = new FamilyMoveService(
    new PeopleEditRepo(fake.db),
    new FamilySearchRepo(fake.db),
    new GuardiansService(fake.db),
    new AuditService(fake.db),
  );
  return { ...fake, service };
}

describe('FamilyMoveService and logins (review a #6, #8)', () => {
  it('refuses a student with a login, and an adult learner whose family has a login', async () => {
    const login = setup({ students: [{ data: { ...STUDENT, profile_id: 'p1' } }] });
    const move = { kind: 'existing', id: 'g-new' } as const;
    await expect(
      login.service.move({ studentId: 's1', move, actorId: 'u1', owns }),
    ).rejects.toMatchObject({
      response: { code: 'student_has_login' },
    });
    const self = setup({
      students: [{ data: { ...STUDENT, contact_is_self: true } }],
      guardians: [{ data: { id: 'g-old', profile_id: 'p9' } }],
    });
    await expect(
      self.service.move({ studentId: 's1', move, actorId: 'u1', owns }),
    ).rejects.toMatchObject({
      response: { code: 'self_has_login' },
    });
    for (const t of [login, self]) expect(t.argsOf('students', 'update')).toBeUndefined();
  });
});
