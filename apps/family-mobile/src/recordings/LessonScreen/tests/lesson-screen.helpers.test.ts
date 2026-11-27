import { t } from '@ab/mobile-kit';
import { lessonHeading } from '@/recordings/LessonScreen/lesson-screen.helpers';

const clock = { tz: 'Asia/Riyadh', cycle: '24', locale: 'ar' } as const;
const lesson = {
  lesson_starts_at: '2026-11-15T14:00:00.000Z',
  lesson_ends_at: '2026-11-15T14:45:00.000Z',
};

test('still loading: the plain lesson page title, no subtitle', () => {
  expect(lessonHeading({ lesson: undefined, name: 'سارة', clock })).toEqual({
    title: t.lessonFiles.lessonPage,
    subtitle: undefined,
  });
});

test('a lesson: its day in the title, the name and the hours under it', () => {
  const { title, subtitle } = lessonHeading({ lesson, name: 'سارة', clock });
  expect(title).toMatch(/^حلقة الأحد،? 15 نوفمبر$/);
  expect(subtitle).toMatch(/^سارة · 17:00.+17:45$/);
});

test('no student name yet: only the hours', () => {
  const { subtitle } = lessonHeading({ lesson, name: undefined, clock });
  expect(subtitle).toMatch(/^17:00.+17:45$/);
});
