import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { TeacherCancelForm } from './TeacherCancelForm';

const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: () => new Promise(() => undefined),
  apiSend: (m: string, p: string, b?: unknown) => mockApiSend(m, p, b),
}));

const w = t.teacherBoard;
const onDone = jest.fn();
const onClose = jest.fn();
const show = () =>
  renderWithQuery(<TeacherCancelForm lessonId="l1" onClose={onClose} onDone={onDone} />);

beforeEach(() => jest.clearAllMocks());

test('the hint and the reason; «تأكيد الإلغاء» without a reason says it is required, sends nothing', async () => {
  await show();
  expect(screen.getByText(w.cancelHint)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: w.cancelSubmit }));
  expect(screen.getByText(w.reasonRequired)).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText(new RegExp(w.reason)), '   ');
  await fireEvent.press(screen.getByRole('button', { name: w.cancelSubmit }));
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('a reason: POST /teachers/me/lessons/:id/cancel {reason}, then «أُلغيت الحلقة…»', async () => {
  mockApiSend.mockResolvedValue({ id: 'l1', status: 'cancelled_by_teacher' });
  await show();
  await fireEvent.changeText(screen.getByLabelText(new RegExp(w.reason)), ' مرض ');
  await fireEvent.press(screen.getByRole('button', { name: w.cancelSubmit }));
  await waitFor(() => expect(onDone).toHaveBeenCalledWith(w.cancelledOk));
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/teachers/me/lessons/l1/cancel', {
    reason: 'مرض',
  });
});

test('409 lesson_started: the line says the lesson started; nothing is announced', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'lesson_started' }));
  await show();
  await fireEvent.changeText(screen.getByLabelText(new RegExp(w.reason)), 'سفر');
  await fireEvent.press(screen.getByRole('button', { name: w.cancelSubmit }));
  expect(await screen.findByText(w.lessonStarted)).toBeTruthy();
  expect(onDone).not.toHaveBeenCalled();
});

test('«تراجع» closes the form', async () => {
  await show();
  await fireEvent.press(screen.getByRole('button', { name: w.keep }));
  expect(onClose).toHaveBeenCalled();
});
