import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { listStudents } from './students.repo';
import { listRow } from '@/modules/people/students/testing/students.rows';


describe('listStudents is_test (docs/56)', () => {
  it('marks the page test students for the «تجريبي» chip', async () => {
    const { db, argsOf } = fakeDb({
      v_student_list: [{ data: [listRow('s1'), listRow('s2')], count: 2 }],
      students: [{ data: [{ id: 's1' }] }],
    });
    const page = await listStudents(db, { page: 1, pageSize: 20, search: '' });
    expect(page.items.map((s) => [s.id, s.is_test])).toEqual([['s1', true], ['s2', false]]);
    expect(argsOf('students', 'eq')).toEqual(['is_test', true]);
  });
});
