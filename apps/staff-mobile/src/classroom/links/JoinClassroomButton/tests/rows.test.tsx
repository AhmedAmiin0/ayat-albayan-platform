import { render, screen } from '@testing-library/react-native';
import { AgendaLessonRow } from '@/calendar/agenda/AgendaLessonRow';
import { t } from '@ab/mobile-kit';
import { lesson } from '@/today/testing/fixtures';
import { mockCall } from '@ab/testing/mock-call';

test('the agenda row (admin schedule and teacher calendar) carries «ادخل الحلقة»', async () => {
  await render(<AgendaLessonRow lesson={lesson({ id: 'a' })} onReschedule={jest.fn()} />);
  expect(screen.getByRole('button', { name: t.classroom.enter })).toBeTruthy();
});

test('a cancelled row does not', async () => {
  await render(
    <AgendaLessonRow
      lesson={lesson({ id: 'b', status: 'cancelled_by_admin' })}
      onReschedule={jest.fn()}
    />,
  );
  expect(screen.queryByRole('button', { name: t.classroom.enter })).toBeNull();
});

const mockApi = mockCall();
mockApi.onRead(() => new Promise(() => undefined));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
