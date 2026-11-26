import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb, type FakeResult } from '@/common/db/testing/fake-db';
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

describe('FamilySearchRepo error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate with the detail', async () => {
    const { db } = fakeDb({ guardians: [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(new FamilySearchRepo(db).search('سهيلة'))).toEqual({
      status: 409,
      body: { message: 'duplicate', detail: PG_ERRORS.unique.details },
    });
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ guardians: [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(new FamilySearchRepo(db).search('سهيلة'))).toEqual({
      status: 500,
      body: 'db error XX000: boom',
    });
  });
});
