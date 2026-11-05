import { describe, expect, it, vi } from 'vitest';
import { AuditService } from '@/common/audit/audit.service';
import { forbidden } from '@/common/http/errors';
import { fakeDb, type FakeResult } from '@/modules/people/guardians/fake-db';
import { GuardiansService } from '@/modules/people/guardians';
import { FamilyMoveService } from './family-move.service';
import { FamilySearchRepo } from './family-search.repo';
import { PeopleEditRepo } from './people-edit.repo';

// #621 review: a «new» family whose number already exists is that family, and the ownership check
// sees it (its id, created: false) before anything is written.

const STUDENT = { id: 's1', guardian_id: 'g-old', contact_is_self: false, profile_id: null };
const FRESH = { name: 'أبو سهيلة', phone_e164: '+201000000003', tz: 'Africa/Cairo', country: null };
const move = { kind: 'new', guardian: FRESH } as const;

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

describe('FamilyMoveService: the resolved family goes to the ownership check', () => {
  it('a «new» family found by its number is checked as existing; refused = nothing written', async () => {
    const t = setup({ students: [{ data: STUDENT }], guardians: [{ data: { id: 'g-other' } }] });
    const allowed = vi.fn().mockRejectedValue(forbidden('not_your_family'));
    await expect(
      t.service.move({ studentId: 's1', move, actorId: 'u1', allowed }),
    ).rejects.toMatchObject({ response: { code: 'not_your_family' } });
    expect(allowed).toHaveBeenCalledWith({ id: 'g-other', created: false });
    expect(t.argsOf('students', 'update')).toBeUndefined();
    expect(t.trips).not.toContain('audit_log');
  });

  it('a family this move created is handed over as created', async () => {
    const t = setup({
      students: [{ data: STUDENT }, { data: STUDENT }],
      guardians: [{ data: null }, { data: { id: 'g-made' } }],
      audit_log: [{}, {}],
    });
    const allowed = vi.fn().mockResolvedValue(undefined);
    await t.service.move({ studentId: 's1', move, actorId: 'u1', allowed });
    expect(allowed).toHaveBeenCalledWith({ id: 'g-made', created: true });
    expect(t.argsOf('students', 'update')?.[0]).toMatchObject({ guardian_id: 'g-made' });
  });
});
