import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { yusuf } from '@/today/fixtures';
import { SendLinkAction } from './SendLinkAction';

const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));

beforeEach(() => jest.clearAllMocks());
const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

test('a press asks first; cancel sends nothing', async () => {
  await renderWithQuery(<SendLinkAction lessonId="l-1" student={yusuf} named={false} />);
  await press(t.classroom.sendLink);
  expect(screen.getByText(t.mobileClassroom.sendConfirm.replace('{name}', yusuf.name))).toBeTruthy();
  await press(t.common.cancel);
  expect(mockApiSend).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: t.classroom.sendLink })).toBeTruthy();
});

test('confirming POSTs the student, then says «أُرسل الرابط» and the button stays off', async () => {
  mockApiSend.mockResolvedValue({ expires_at: 'x', replayed: false, message_status: 'sent' });
  await renderWithQuery(<SendLinkAction lessonId="l-1" student={yusuf} named />);
  await press(`${t.classroom.sendLink} ${t.classroom.sendLinkTo.replace('{name}', yusuf.name)}`);
  await press(t.mobileClassroom.sendConfirmAction);
  expect(await screen.findByText(t.classroom.linkSent)).toBeTruthy();
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/lessons/l-1/join-link', { studentId: 's1' });
});

test('a replay says it was sent before', async () => {
  mockApiSend.mockResolvedValue({ expires_at: 'x', replayed: true, message_status: 'sent' });
  await renderWithQuery(<SendLinkAction lessonId="l-1" student={yusuf} named={false} />);
  await press(t.classroom.sendLink);
  await press(t.mobileClassroom.sendConfirmAction);
  expect(await screen.findByText(t.classroom.linkResent)).toBeTruthy();
});

test.each([
  [409, 'template_not_approved'],
  [404, 'student_not_in_lesson'],
  [503, 'classroom_not_configured'],
])('a %s refusal shows its message and the button is usable again', async (status, code) => {
  mockApiSend.mockRejectedValue(new ApiError(status, { code }));
  await renderWithQuery(<SendLinkAction lessonId="l-1" student={yusuf} named={false} />);
  await press(t.classroom.sendLink);
  await press(t.mobileClassroom.sendConfirmAction);
  const text: Record<string, string | undefined> = t.classroom.error;
  expect(text[code]).toBeTruthy(); // every code has its own sentence, no fallback
  expect(await screen.findByText(text[code] ?? '')).toBeTruthy();
  await waitFor(() => expect(screen.getByRole('button', { name: t.classroom.sendLink })).toBeTruthy());
});

test('a 403 without a code reads «غير مسموح»', async () => {
  mockApiSend.mockRejectedValue(new ApiError(403, null));
  await renderWithQuery(<SendLinkAction lessonId="l-1" student={yusuf} named={false} />);
  await press(t.classroom.sendLink);
  await press(t.mobileClassroom.sendConfirmAction);
  expect(await screen.findByText(t.mobileClassroom.linkForbidden)).toBeTruthy();
});
