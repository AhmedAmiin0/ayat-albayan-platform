import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '@/common/auth/verify-token';
import { AuditService } from '@/common/audit/audit.service';
import { fakeDb, type FakeResult } from '@/modules/people/guardians/fake-db';
import { GuardiansService } from '@/modules/people/guardians';
import type { SalesOwnershipRule } from '@/modules/sales/sales';
import { PeopleOwnership } from './access/people-ownership';
import { FamilyMoveService } from './family-move.service';
import { FamilySearchRepo } from './family-search.repo';
import { PeopleEditRepo } from './people-edit.repo';

const STUDENT = { id: 's1', guardian_id: 'g-old', contact_is_self: false, profile_id: null };
/** «ولي أمر جديد» whose number is already the main number of assistant B's family. */
const TAKEN = { name: 'اسم مكتوب', phone_e164: '+201000000003', tz: 'Africa/Cairo', country: null };
const MINE = { leadIds: [], guardianIds: ['g-old', 'g-mine'], studentIds: ['s1'], phones: [] };
const SALES: AuthUser = { id: 'a1', email: null, role: 'sales' };

/** The service with the real PeopleOwnership; `own` null = «اشتراط التعيين» off. */
function setup(own: typeof MINE | null, results: Record<string, FakeResult[]>) {
  const fake = fakeDb(results);
  const service = new FamilyMoveService(
    new PeopleEditRepo(fake.db),
    new FamilySearchRepo(fake.db),
    new GuardiansService(fake.db),
    new AuditService(fake.db),
  );
  const scope = vi.fn().mockResolvedValue(own);
  const owners = new PeopleOwnership({ scope } as unknown as SalesOwnershipRule);
  const owns = (id: string) => owners.family(SALES, id);
  const move = (guardian = TAKEN) =>
    service.move({ studentId: 's1', move: { kind: 'new', guardian }, actorId: 'a1', owns });
  return { ...fake, move };
}

const found = (id: string): Record<string, FakeResult[]> => ({
  students: [{ data: STUDENT }, { data: { ...STUDENT, guardian_id: id } }],
  guardians: [{ data: { id } }],
  audit_log: [{}],
});

describe('FamilyMoveService: a «new» number that exists is checked as that family (merge gate #2)', () => {
  it('rule on: another assistant’s family behind the number → 403 not_your_family, nothing written', async () => {
    const t = setup(MINE, found('g-other'));
    await expect(t.move()).rejects.toMatchObject({ response: { code: 'not_your_family' } });
    expect(t.argsOf('students', 'update')).toBeUndefined();
    expect(t.argsOf('guardians', 'insert')).toBeUndefined();
    expect(t.trips).not.toContain('audit_log');
  });

  it('rule on: her own family behind the number moves', async () => {
    const t = setup(MINE, found('g-mine'));
    await expect(t.move()).resolves.toEqual({ student_id: 's1', guardian_id: 'g-mine' });
  });

  it('rule on: a family this move creates is hers, no ownership check', async () => {
    const t = setup(MINE, {
      students: [{ data: STUDENT }, { data: STUDENT }],
      guardians: [{ data: null }, { data: { id: 'g-made', name: TAKEN.name } }],
      audit_log: [{}, {}],
    });
    await expect(t.move()).resolves.toEqual({ student_id: 's1', guardian_id: 'g-made' });
  });

  it('rule off: any existing family behind the number moves', async () => {
    const t = setup(null, found('g-other'));
    await expect(t.move()).resolves.toEqual({ student_id: 's1', guardian_id: 'g-other' });
    expect(t.argsOf('students', 'update')?.[0]).toMatchObject({ guardian_id: 'g-other' });
  });
});
