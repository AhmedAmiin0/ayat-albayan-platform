import { describe, expect, it } from 'vitest';
import type { Db } from '@/common/db/db.module';
import { ChannelPeopleRepo } from './channel-people.repo';

// A chat message's assistants (owner 2026-11-16): the student's owners as the owner route reads
// them (who brought it, who holds its family's lead), salespeople only, never an admin.

const PROFILES = [
  { id: 's1', role: 'sales', full_name: 'سارة' },
  { id: 's2', role: 'sales', full_name: 'هدى' },
  { id: 'a1', role: 'admin', full_name: 'المدير' },
];

function repo(broughtBy: string | null, leadOwners: (string | null)[]) {
  const student = { brought_by: broughtBy, guardian_id: 'g1' };
  const from = (table: string) => {
    const asked = { ids: [] as string[], role: '' };
    const sales = () =>
      PROFILES.filter((p) => asked.ids.includes(p.id) && p.role === asked.role);
    const rows = () =>
      table === 'leads' ? leadOwners.map((assigned_to) => ({ assigned_to })) : sales();
    const q = {
      select: () => q,
      in: (_c: string, v: string[]) => {
        asked.ids = v;
        return q;
      },
      eq: (c: string, v: string) => {
        if (c === 'role') asked.role = v;
        return q;
      },
      maybeSingle: async () => ({ data: student, error: null }),
      then: (resolve: (v: unknown) => void) => resolve({ data: rows(), error: null }),
    };
    return q;
  };
  return new ChannelPeopleRepo({ from } as unknown as Db);
}

describe('ChannelPeopleRepo.ownerIds', () => {
  it('who brought the student and who holds its lead, each once', async () => {
    expect(await repo('s1', ['s2', 's1', null]).ownerIds('st1')).toEqual(['s1', 's2']);
  });

  it('an admin owner is left out; nobody owns the student → none', async () => {
    expect(await repo('a1', ['s2']).ownerIds('st1')).toEqual(['s2']);
    expect(await repo(null, []).ownerIds('st1')).toEqual([]);
  });
});

// Owner 2026-11-16 «yes it can write also»: her bubble and push carry her name.
describe('ChannelPeopleRepo.names', () => {
  it('an assistant who wrote is named by her profile; an admin profile is not', async () => {
    expect(await repo(null, []).names(['s1', 'a1'])).toEqual(new Map([['s1', 'سارة']]));
  });
});
