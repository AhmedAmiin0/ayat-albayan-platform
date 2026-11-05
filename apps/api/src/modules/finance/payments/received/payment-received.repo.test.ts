import { describe, expect, it } from 'vitest';
import type { Db } from '@/common/db/db.module';
import { PaymentReceivedRepo } from './payment-received.repo';

type Student = { brought_by: string | null; guardian_id: string } | null;

function fakeDb(student: Student, leads: { assigned_to: string | null }[]) {
  const from = (table: string) => ({
    select: () => ({
      eq: (_c: string, _v: string) => ({
        maybeSingle: async () => ({ data: student, error: null }),
        is: async () => ({ data: [{ id: 'a1' }], error: null }),
        then: (resolve: (v: unknown) => void) =>
          resolve(table === 'leads' ? { data: leads, error: null } : { data: [], error: null }),
      }),
    }),
  });
  return new PaymentReceivedRepo({ from } as unknown as Db);
}

describe('PaymentReceivedRepo', () => {
  it('ownerIds: who brought the student and the assigned assistant of the family’s lead', async () => {
    const repo = fakeDb({ brought_by: 's1', guardian_id: 'g1' }, [{ assigned_to: 's2' }, { assigned_to: null }]);
    expect(await repo.ownerIds('st1')).toEqual(['s1', 's2']);
  });

  it('ownerIds: nobody brought the student and no lead → none; an unknown student → none', async () => {
    expect(await fakeDb({ brought_by: null, guardian_id: 'g1' }, []).ownerIds('st1')).toEqual([]);
    expect(await fakeDb(null, [{ assigned_to: 's2' }]).ownerIds('st1')).toEqual([]);
  });

  it('adminIds: the enabled admins', async () => {
    expect(await fakeDb(null, []).adminIds()).toEqual(['a1']);
  });
});
