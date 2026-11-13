import { screen } from '@testing-library/react-native';
import { AppText } from '@/core/ui/primitives/AppText';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { lesson } from '@/today/testing/fixtures';
import { AgendaLessonRow } from './AgendaLessonRow';

jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: () => new Promise(() => undefined),
}));
// 16:50 Riyadh: the 16:00–16:45 lesson ended; its classroom window stays open (docs/48).
jest.mock('@/core/lib/time/use-now', () => ({ useNow: () => new Date('2026-10-01T13:50:00Z') }));

const row = lesson({ id: 'a', status: 'confirmed' });

test('the defaults as before: the status chip, the length line and JoinAround’s join', async () => {
  await renderWithQuery(<AgendaLessonRow lesson={row} onReschedule={jest.fn()} />);
  expect(screen.getByText(t.enums.lessonStatus.confirmed)).toBeTruthy();
  expect(screen.getByText(new RegExp(t.enums.duration['45']))).toBeTruthy();
  expect(screen.getByRole('button', { name: t.classroom.enter })).toBeTruthy();
});

test('the teacher’s props: her meta line, her chip, and her actions alone (join false)', async () => {
  await renderWithQuery(
    <AgendaLessonRow
      lesson={row}
      onReschedule={jest.fn()}
      meta="عند الطالب 17:00"
      chip={<AppText>كلمتها</AppText>}
      join={false}
      actions={<AppText>زرها</AppText>}
    />,
  );
  expect(screen.getByText('عند الطالب 17:00')).toBeTruthy();
  expect(screen.queryByText(new RegExp(t.enums.duration['45']))).toBeNull();
  expect(screen.getByText('كلمتها')).toBeTruthy();
  expect(screen.queryByText(t.enums.lessonStatus.confirmed)).toBeNull();
  expect(screen.getByText('زرها')).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.classroom.enter })).toBeNull();
});

test('join false with no actions: nothing under the line (an ended teacher row)', async () => {
  await renderWithQuery(<AgendaLessonRow lesson={row} onReschedule={jest.fn()} join={false} />);
  expect(screen.queryByRole('button')).toBeNull();
});
