import { QueryClient } from '@tanstack/react-query';
import { invoiceKeys, salesCourseKeys, studentKeys } from '@/core/lib/keys';

it('keeps the key shapes the screens already cache under', () => {
  expect(studentKeys.one('s1')).toEqual(['students', 's1']);
  expect(studentKeys.statusCounts({ q: 'a' })).toEqual(['students', 'status-counts', { q: 'a' }]);
  expect(studentKeys.teacherOptions()).toEqual(['students', 'teacher-options']);
  expect(invoiceKeys.ofStudent('s1')).toEqual(['invoices', 'student', 's1']);
  expect(salesCourseKeys.course('s1')).toEqual(['sales', 'booking', 'course', { studentId: 's1' }]);
  expect(salesCourseKeys.check('{}')).toEqual(['sales', 'booking', 'check', '{}']);
  expect(salesCourseKeys.changeCheck('/p', '{}')).toEqual([
    'sales',
    'booking',
    'course-change',
    'check',
    '/p',
    '{}',
  ]);
});

const staleAfter = async (keys: readonly (readonly unknown[])[], root: readonly unknown[]) => {
  const client = new QueryClient();
  keys.forEach((key) => client.setQueryData(key, 1));
  await client.invalidateQueries({ queryKey: root, refetchType: 'none' });
  return keys.filter((key) => client.getQueryState(key)?.isInvalidated);
};

it('refreshes the student reads after a student write, and not the invoices', async () => {
  const mine = [studentKeys.one('s1'), studentKeys.statusCounts({}), studentKeys.teacherOptions()];
  expect(await staleAfter([...mine, invoiceKeys.ofStudent('s1')], studentKeys.all)).toEqual(mine);
});

it('refreshes the course after a booking, and leaves the checks to their own body keys', async () => {
  const keys = [salesCourseKeys.course('s1'), salesCourseKeys.check('{}')];
  expect(await staleAfter(keys, ['sales', 'booking', 'course'])).toEqual([keys[0]]);
});

it('refreshes every sales booking read after a sales write', async () => {
  const keys = [
    salesCourseKeys.course('s1'),
    salesCourseKeys.check('{}'),
    salesCourseKeys.changeCheck('/p', '{}'),
  ];
  expect(await staleAfter(keys, ['sales'])).toEqual(keys);
});
