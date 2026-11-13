import type { TeacherCourseView } from '@ab/shared';
import { screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { CourseLine } from './CourseLine';

const course: TeacherCourseView = {
  starts_on: '2026-10-01',
  stopped_at: null,
  ended_at: null,
  projected_end_at: null,
  lessons_total: 8,
  lessons_used: 5,
  lessons_remaining: 3,
};

test('the course: the end in lessons left, the count and the every-teacher hint', async () => {
  await renderWithQuery(<CourseLine course={course} tz="Africa/Cairo" />);
  expect(screen.getByText(t.teacherFile.courseEndsAfter.few.replace('{n}', '3'))).toBeTruthy();
  const count = t.teacherFile.courseLessons.replace('{used}', '5').replace('{total}', '8');
  expect(screen.getByText(count)).toBeTruthy();
  expect(screen.getByText(t.teacherFile.courseHint)).toBeTruthy();
});

test('no current course: one note, no hint', async () => {
  await renderWithQuery(<CourseLine course={null} tz="Africa/Cairo" />);
  expect(screen.getByText(t.teacherFile.noCourse)).toBeTruthy();
  expect(screen.queryByText(t.teacherFile.courseHint)).toBeNull();
});
