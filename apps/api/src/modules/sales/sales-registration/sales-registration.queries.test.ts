import { describe, expect, it } from 'vitest';
import { fakeDb } from '../../people/guardians/fake-db';
import { SalesRegistrationQueries, toMatch } from './sales-registration.queries';

const dbRow = { name: 'ياسمين', code: 'AB-0101', status: 'churned', teacher: { display_name_ar: 'أبرار' }, guardian: { phone_e164: '+966551110000' } };
const MATCH = { name: 'ياسمين', code: 'AB-0101', status: 'churned', teacher_name: 'أبرار' };

describe('SalesRegistrationQueries', () => {
  it('byPhone: the guardian’s children by phone, by name, 11 rows at most, without the join columns', async () => {
    const t = fakeDb({ students: [{ data: [dbRow] }] });
    expect(await new SalesRegistrationQueries(t.db).byPhone('+966551110000')).toEqual([MATCH]);
    expect(t.argsOf('students', 'eq')).toEqual(['guardian.phone_e164', '+966551110000']);
    expect(t.argsOf('students', 'order')).toEqual(['name']);
    expect(t.argsOf('students', 'limit')).toEqual([11]);
    const select = String(t.argsOf('students', 'select')?.[0]);
    expect(select).toContain('guardians!inner(phone_e164)');
    expect(select).not.toMatch(/\bid\b|notes|price/);
    expect(t.calls.some((c) => c.method === 'in' || c.method === 'neq')).toBe(false); // every status
  });

  it('byName: the admin list’s name-or-code filter (Arabic-normalised), by name, 11 rows at most', async () => {
    const t = fakeDb({ students: [{ data: [dbRow] }] });
    expect(await new SalesRegistrationQueries(t.db).byName('ياسمين')).toEqual([MATCH]);
    expect(String(t.argsOf('students', 'or')?.[0])).toMatch(/^name_normalized\.ilike\..*,code\.ilike\.\*ياسمين\*$/);
    expect(t.argsOf('students', 'limit')).toEqual([11]);
    expect(String(t.argsOf('students', 'select')?.[0])).not.toContain('guardian');
  });

  it('byName: _ (ilike’s one-character wildcard) is searched as a space, never sent in a term', async () => {
    const t = fakeDb({ students: [{ data: [] }] });
    await new SalesRegistrationQueries(t.db).byName('um_ahmad');
    expect(t.argsOf('students', 'or')).toEqual(['name_normalized.ilike.*um ahmad*,code.ilike.*um ahmad*']);
    expect(await new SalesRegistrationQueries(fakeDb({}).db).byName('___')).toEqual([]);
  });

  it('byName: a term with nothing searchable left reads nothing', async () => {
    const t = fakeDb({});
    expect(await new SalesRegistrationQueries(t.db).byName(',,,')).toEqual([]);
    expect(t.calls).toEqual([]);
  });

  it('a db error is thrown', async () => {
    const t = fakeDb({ students: [{ error: { code: 'XX', message: 'boom' } }] });
    await expect(new SalesRegistrationQueries(t.db).byName('ياسمين')).rejects.toThrow(/boom/);
  });

  it('toMatch: no teacher → null, a missing code → empty', () => {
    expect(toMatch({ name: 'عمر', code: null, status: 'trial', teacher: null })).toEqual({ name: 'عمر', code: '', status: 'trial', teacher_name: null });
  });
});
