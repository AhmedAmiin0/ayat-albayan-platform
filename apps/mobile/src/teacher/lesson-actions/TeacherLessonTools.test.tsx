import type { LessonView } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { lesson } from '@/today/testing/fixtures';
import { TeacherLessonTools } from './TeacherLessonTools';

const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: () => new Promise(() => undefined),
  apiSend: (m: string, p: string, b?: unknown) => mockApiSend(m, p, b),
}));
// An hour before the fixture's 13:00Z start.
jest.mock('@/core/lib/time/use-now', () => ({ useNow: () => new Date('2026-10-01T12:00:00Z') }));

const w = t.teacherBoard;

const onDone = jest.fn();

function Tools({ l }: { l: LessonView }) {
  return <TeacherLessonTools lesson={l} onDone={onDone} />;
}

beforeEach(() => jest.clearAllMocks());

test('before the start: «سأحضر» posts confirm-attendance, then onDone and the chip', async () => {
  mockApiSend.mockResolvedValue(lesson({ id: 'l1', teacher_confirmed_at: '2026-10-01T12:00:00Z' }));
  await renderWithQuery(<Tools l={lesson({ id: 'l1' })} />);
  await fireEvent.press(screen.getByRole('button', { name: w.confirm }));
  await waitFor(() => expect(onDone).toHaveBeenCalledWith(w.confirmedOk));
  expect(mockApiSend).toHaveBeenCalledWith(
    'POST',
    '/teachers/me/lessons/l1/confirm-attendance',
    undefined,
  );
  expect(screen.getByText(w.confirmedChip)).toBeTruthy();
  expect(screen.queryByRole('button', { name: w.confirm })).toBeNull();
});

test('a refused «سأحضر» (409 lesson_started) says so', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'lesson_started' }));
  await renderWithQuery(<Tools l={lesson({ id: 'l1' })} />);
  await fireEvent.press(screen.getByRole('button', { name: w.confirm }));
  expect(await screen.findByText(w.lessonStarted)).toBeTruthy();
});

test('«إلغاء الحلقة» opens the reason form in place; a landed cancel calls onDone', async () => {
  mockApiSend.mockResolvedValue(lesson({ id: 'l1', status: 'cancelled_by_teacher' }));
  await renderWithQuery(<Tools l={lesson({ id: 'l1' })} />);
  await fireEvent.press(screen.getByRole('button', { name: w.cancel }));
  expect(screen.getByTestId('teacher-cancel-form')).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText(new RegExp(w.reason)), 'سفر');
  await fireEvent.press(screen.getByRole('button', { name: w.cancelSubmit }));
  await waitFor(() => expect(onDone).toHaveBeenCalledWith(w.cancelledOk));
  expect(onDone).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId('teacher-cancel-form')).toBeNull();
});

test('nothing to do on a started, closed or other lesson', async () => {
  await renderWithQuery(<Tools l={lesson({ id: 'l2', status: 'cancelled_by_admin' })} />);
  expect(screen.queryByRole('button', { name: w.confirm })).toBeNull();
  expect(screen.queryByRole('button', { name: w.cancel })).toBeNull();
});
