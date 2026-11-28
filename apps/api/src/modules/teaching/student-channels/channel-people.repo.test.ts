import { describe, expect, it } from 'vitest';
import type { Db } from '@/common/db/db.module';
import { ChannelPeopleRepo } from './channel-people.repo';

// The chat's one assistant: the seat holder while she is a
// salesperson, never an admin or a former assistant.

const PROFILES = [
  { id: 's1', role: 'sales', full_name: 'سارة' },
  { id: 's2', role: 'sales', full_name: 'هدى' },
  { id: 'a1', role: 'admin', full_name: 'المدير' },
];

function repo(holder: string | null) {
  const from = () => {
    const asked = { ids: [] as string[], role: '' };
    const sales = () => PROFILES.filter((p) => asked.ids.includes(p.id) && p.role === asked.role);
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
      maybeSingle: async () => ({ data: { assistant_id: holder }, error: null }),
      then: (resolve: (v: unknown) => void) => resolve({ data: sales(), error: null }),
    };
    return q;
  };
  return new ChannelPeopleRepo({ from } as unknown as Db);
}

describe('ChannelPeopleRepo.assistantId', () => {
  it('the seat holder, a salesperson', async () => {
    expect(await repo('s1').assistantId('st1')).toBe('s1');
  });

  it('a free seat, or a holder who is no longer an assistant → none', async () => {
    expect(await repo(null).assistantId('st1')).toBeNull();
    expect(await repo('a1').assistantId('st1')).toBeNull();
  });
});

// The seated assistant writes too: her bubble and push carry her name.
describe('ChannelPeopleRepo.names', () => {
  it('an assistant who wrote is named by her profile; an admin profile is not', async () => {
    expect(await repo(null).names(['s1', 'a1'])).toEqual(new Map([['s1', 'سارة']]));
  });
});
