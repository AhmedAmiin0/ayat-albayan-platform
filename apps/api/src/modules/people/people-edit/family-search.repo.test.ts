import { describe, expect, it } from 'vitest';
import { fakeDb, type FakeResult } from '@/modules/people/guardians/fake-db';
import { FamilySearchRepo } from './family-search.repo';

function setup(results: Record<string, FakeResult[]>) {
  const fake = fakeDb(results);
  return {
    ...fake,
    service: { families: (term: string) => new FamilySearchRepo(fake.db).search(term) },
  };
}

describe('FamilySearchRepo, the guardian picker', () => {
  it('the picker searches a code, a number or a name', async () => {
    const t = setup({
      students: [{ data: [{ guardian_id: 'g1' }] }],
      guardians: [
        { data: [{ id: 'g1', name: 'أم سهيلة', phone_e164: '+201000000001', students: [] }] },
      ],
    });
    await expect(t.service.families('ab-0183')).resolves.toHaveLength(1);
    expect(t.argsOf('students', 'eq')).toEqual(['code', 'AB-0183']);
    const n = setup({ guardian_phones: [{ data: [] }] });
    await expect(n.service.families('0100 000')).resolves.toEqual([]);
    expect(n.argsOf('guardian_phones', 'ilike')).toEqual(['phone_e164', '%100000%']);
    const name = setup({ guardians: [{ data: [] }] });
    await expect(name.service.families('أم %سهيلة')).resolves.toEqual([]);
    expect(name.argsOf('guardians', 'ilike')).toEqual(['name', '%أم سهيلة%']);
  });

  it('ten families at most, each once, with their children', async () => {
    const t = setup({
      guardian_phones: [{ data: [{ guardian_id: 'g1' }, { guardian_id: 'g1' }] }],
      guardians: [{ data: [] }],
    });
    await t.service.families('+20 100');
    expect(t.argsOf('guardian_phones', 'limit')).toEqual([10]);
    expect(t.argsOf('guardians', 'in')).toEqual(['id', ['g1']]);
    expect(t.argsOf('guardians', 'select')).toEqual(['id, name, phone_e164, students(code, name)']);
  });
});
