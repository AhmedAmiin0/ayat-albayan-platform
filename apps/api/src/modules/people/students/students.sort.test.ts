import { describe, expect, it } from 'vitest';
import { fakeDb } from '../guardians/fake-db';
import { listStudents } from './students.queries';

const page = { search: '', page: 1, pageSize: 20 };
const empty = () => fakeDb({ v_student_list: [{ data: [], count: 0 }] });
const orders = (calls: { method: string; args: unknown[] }[]) => calls.filter((c) => c.method === 'order').map((c) => c.args);

describe('students list sort + column filters (R-NFR-08)', () => {
  it('no sort → newest first, as before', async () => {
    const { db, calls } = empty();
    await listStudents(db, page);
    expect(orders(calls)).toEqual([['created_at', { ascending: false }]]);
  });

  it('a key maps to its column, then newest first as the tiebreaker', async () => {
    const { db, calls } = empty();
    await listStudents(db, { ...page, sort: 'name', dir: 'desc' });
    expect(orders(calls)).toEqual([
      ['name_normalized', { ascending: false }],
      ['created_at', { ascending: false }],
    ]);
  });

  it('guardian / teacher sort the parent rows by the to-one embed, teacherless last', async () => {
    const a = empty();
    await listStudents(a.db, { ...page, sort: 'guardian' });
    expect(orders(a.calls)[0]).toEqual(['guardian(name)', { ascending: true }]);
    const b = empty();
    await listStudents(b.db, { ...page, sort: 'teacher' });
    expect(orders(b.calls)[0]).toEqual(['teacher(display_name_ar)', { ascending: true, nullsFirst: false }]);
  });

  it('remaining and weekly sort the view columns', async () => {
    const { db, calls } = empty();
    await listStudents(db, { ...page, sort: 'remaining', dir: 'desc' });
    expect(orders(calls)[0]).toEqual(['package_remaining', { ascending: false, nullsFirst: false }]);
  });

  it('text filters: code, normalised name, guardian name (escaped «contains»)', async () => {
    const { db, calls } = empty();
    await listStudents(db, { ...page, code: 'AB-01', name: 'سهيلة', guardian: '50%' });
    const ilike = calls.filter((c) => c.method === 'ilike').map((c) => c.args);
    expect(ilike).toEqual([
      ['code', '%AB-01%'],
      ['name_normalized', '%سهيله%'],
      ['guardian.name', '%50\\%%'],
    ]);
  });

  it('column filters sit beside the select filters and the search', async () => {
    const { db, calls } = empty();
    await listStudents(db, { ...page, search: 'سهيلة', program: 'quran', code: '01' });
    const methods = calls.map((c) => c.method);
    expect(methods).toEqual(expect.arrayContaining(['eq', 'ilike', 'or', 'order', 'range']));
  });
});
