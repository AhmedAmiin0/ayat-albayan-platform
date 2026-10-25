import { render, screen } from '@testing-library/react-native';
import { AgendaLessonRow } from '@/calendar/AgendaLessonRow';
import { t } from '@/core/lib/i18n/i18n';
import { lesson } from '@/today/fixtures';
import { LessonCard } from '@/today/LessonCard';
import { renderWithQuery } from '@/test/query';

test('the agenda row (admin schedule and teacher calendar) carries «ادخل الحلقة»', async () => {
  await render(<AgendaLessonRow lesson={lesson({ id: 'a' })} onReschedule={jest.fn()} />);
  expect(screen.getByRole('button', { name: t.classroom.enter })).toBeTruthy();
});

test('a cancelled row does not', async () => {
  await render(
    <AgendaLessonRow lesson={lesson({ id: 'b', status: 'cancelled_by_admin' })} onReschedule={jest.fn()} />,
  );
  expect(screen.queryByRole('button', { name: t.classroom.enter })).toBeNull();
});

jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: () => new Promise(() => undefined),
}));

test("Today's open card carries «ادخل الحلقة»", async () => {
  await renderWithQuery(
    <LessonCard lesson={lesson({ id: 'c' })} busy={false} onConfirm={jest.fn()} onCancel={jest.fn()} onReschedule={jest.fn()} />,
  );
  expect(screen.getByRole('button', { name: t.classroom.enter })).toBeTruthy();
});
