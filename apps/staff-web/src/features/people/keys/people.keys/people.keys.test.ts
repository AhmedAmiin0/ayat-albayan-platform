import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import {
  assistantPayKeys,
  guardianKeys,
  recordingKeys,
  recoveryKeys,
  roleKeys,
  studentKeys,
  teacherKeys,
  userKeys,
} from '@/features/people/keys';

const staleAfter = async (keys: readonly (readonly unknown[])[], root: readonly unknown[]) => {
  const client = new QueryClient();
  keys.forEach((key) => client.setQueryData(key, 'cached'));
  await client.invalidateQueries({ queryKey: root, refetchType: 'none' });
  return keys.filter((key) => client.getQueryState(key)?.isInvalidated === true);
};

const PAGE = { page: 2, sort: { by: 'name' }, filters: { status: 'active' } };

describe('people keys', () => {
  it('keeps the key shapes the people screens already cache under', () => {
    expect(studentKeys.list({ search: 'a', page: 1 })).toEqual([
      'students',
      'list',
      { search: 'a', page: 1 },
    ]);
    expect(studentKeys.detail('s1')).toEqual(['students', 's1']);
    expect(teacherKeys.list(PAGE)).toEqual(['teachers', 'list', 2, { by: 'name' }, PAGE.filters]);
    expect(teacherKeys.timeOff('t1')).toEqual(['teachers', 't1', 'time-off']);
    expect(userKeys.detail('u1')).toEqual(['users', 'detail', 'u1']);
    expect(userKeys.candidates('teacher', 'ab')).toEqual(['users', 'candidates', 'teacher', 'ab']);
    expect(roleKeys.staffUsers()).toEqual(['roles', 'users']);
    expect(assistantPayKeys.broughtBy('s1')).toEqual(['assistant-pay', 'brought-by', 's1']);
    expect(recoveryKeys.session()).toEqual(['set-password', 'recovery-session']);
  });

  it('keys a recordings page by student, filters, page and page size', () => {
    const q = { studentId: 's1', filters: { visible: true }, page: 3, pageSize: 10 };
    expect(recordingKeys.page(q)).toEqual(['student-recordings', 's1', { visible: true }, 3, 10]);
    expect(recordingKeys.recordedLessonIds('s1')).toEqual([
      'student-recordings',
      's1',
      'recorded-lesson-ids',
    ]);
  });

  it('marks every student read stale when a student write invalidates the root', async () => {
    const reads = [
      studentKeys.list({ page: 1 }),
      studentKeys.statusCounts({}),
      studentKeys.detail('s1'),
      studentKeys.teacherOptions(),
    ];
    expect(await staleAfter(reads, studentKeys.all)).toEqual(reads);
  });

  it('refreshes one teacher without touching another teacher', async () => {
    const mine = [teacherKeys.detail('t1'), teacherKeys.availability('t1')];
    const other = [teacherKeys.timeOff('t2')];
    expect(await staleAfter([...mine, ...other], teacherKeys.detail('t1'))).toEqual(mine);
  });

  it('keeps each root apart, so a users write leaves the roles and guardians fresh', async () => {
    const others = [
      roleKeys.staffUsers(),
      guardianKeys.detail('g1'),
      assistantPayKeys.assistants(),
    ];
    const users = [userKeys.list({ page: 1 }), userKeys.roleOptions()];
    expect(await staleAfter([...users, ...others], userKeys.all)).toEqual(users);
  });

  it('keeps the recovery session check off every people root', async () => {
    const roots = [studentKeys.all, teacherKeys.all, userKeys.all, roleKeys.all];
    const hits = await Promise.all(roots.map((root) => staleAfter([recoveryKeys.session()], root)));
    expect(hits.flat()).toEqual([]);
  });
});
