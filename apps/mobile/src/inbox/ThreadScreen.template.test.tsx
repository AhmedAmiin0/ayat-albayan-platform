import type { ThreadLesson } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { detail, inbound, meetReminder, notApproved, plainReminder, thread } from './thread-fixtures';
import { ThreadScreen } from './ThreadScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ phone: '+966552147730' }),
}));

const names = t.templates.names;
const labels = t.inbox.composer.paramNames;
const twoDaysAgo = new Date(Date.now() - 2 * 24 * 3_600_000).toISOString();
const LESSON: ThreadLesson = {
  id: 'l-1',
  starts_at: '2026-10-04T14:00:00Z',
  meeting_link: null,
  student_names: ['سهيلة'],
  tz: 'Asia/Riyadh',
};
const teacherTemplate = { ...plainReminder, key: 'teacher_lesson_reminder', params: ['teacher_name', 'lesson_slot'] };
const closed = detail([inbound], {
  thread: { ...thread, last_inbound_at: twoDaysAgo, session_open: true, guardian_id: 'g-1' },
  lessons: [LESSON],
});

async function openClosedThread() {
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path === '/messaging/templates') return [plainReminder, meetReminder, notApproved, teacherTemplate];
    if (path === '/messages/gate') return { open: true, reason: null, queued: 0 };
    return closed;
  });
  await renderWithQuery(<ThreadScreen />);
  await screen.findByText(inbound.body ?? '');
}
const sendButton = () => screen.getByRole('button', { name: t.inbox.composer.send });
const lessonPill = () => screen.getByRole('radio', { name: 'الأحد 4 أكتوبر 17:00' });

async function choose(name: string) {
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.sendTemplate }));
  await fireEvent.press(await screen.findByText(name));
}

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset();
});

test('after 24 h (by the clock, whatever the cached flag): no free text, the reason verbatim', async () => {
  await openClosedThread();
  expect(screen.getByText('مضى أكثر من 24 ساعة على آخر رسالة منه — يجب أن ترسل قالبًا')).toBeTruthy();
  expect(screen.queryByLabelText(t.inbox.composer.placeholder)).toBeNull();
});

test('the sheet lists only this person’s approved templates, by their Arabic name', async () => {
  await openClosedThread();
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.sendTemplate }));
  expect(await screen.findByText(names.lesson_reminder_plain)).toBeTruthy();
  expect(screen.getByText(names.lesson_reminder_meet)).toBeTruthy();
  expect(screen.queryByText(names.renewal_due)).toBeNull();
  expect(screen.queryByText(names.teacher_lesson_reminder)).toBeNull();
});

test('the lesson time is picked, never typed (rule 6); the send carries the lesson and goes out at once', async () => {
  mockApiSend.mockReturnValue(new Promise(() => undefined));
  await openClosedThread();
  await choose(names.lesson_reminder_plain);
  expect(screen.getByLabelText(labels.lesson_time).props.editable).toBe(false);
  await fireEvent.press(sendButton());
  expect(screen.getByText(t.inbox.composer.pickLesson)).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();

  await fireEvent.press(lessonPill());
  expect(screen.getByLabelText(labels.lesson_time).props.value).toBe('17:00');
  expect(screen.getByLabelText(labels.student_names).props.value).toBe('سهيلة');
  await fireEvent.press(sendButton());
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/threads/%2B966552147730/template', {
    key: 'lesson_reminder_plain',
    params: { '1': 'سهيلة', '2': '17:00' },
    clientRequestId: expect.stringMatching(/^[0-9a-f-]{36}$/),
    lessonId: 'l-1',
  });
  await waitFor(() => expect(screen.queryByLabelText(labels.lesson_time)).toBeNull());
  // The sent row lands through the virtualized list a render later: wait for it, don't read at once.
  expect(await screen.findByText(t.inbox.templateLine.replace('{name}', names.lesson_reminder_plain))).toBeTruthy();
  expect(await screen.findByText('حلقة سهيلة النهاردة — 17:00')).toBeTruthy();
});

test('a template with a meeting link also needs its code', async () => {
  mockApiSend.mockReturnValue(new Promise(() => undefined));
  await openClosedThread();
  await choose(names.lesson_reminder_meet);
  await fireEvent.press(lessonPill());
  await fireEvent.press(sendButton());
  expect(mockApiSend).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText(t.inbox.composer.button), 'abc-defg-hij');
  await fireEvent.press(sendButton());
  expect(mockApiSend).toHaveBeenCalledWith(
    'POST',
    '/threads/%2B966552147730/template',
    expect.objectContaining({ params: { '1': 'سهيلة', '2': '17:00', button: 'abc-defg-hij' } }),
  );
});

test('the same template sent again after a failure keeps its clientRequestId (rule 8)', async () => {
  mockApiSend.mockRejectedValue(new Error('offline'));
  await openClosedThread();
  for (let i = 0; i < 2; i++) {
    await choose(names.lesson_reminder_plain);
    await fireEvent.press(lessonPill());
    await fireEvent.press(sendButton());
    await waitFor(() => expect(mockApiSend).toHaveBeenCalledTimes(i + 1));
  }
  const ids = mockApiSend.mock.calls.map((c) => (c[2] as { clientRequestId: string }).clientRequestId);
  expect(ids[0]).toBe(ids[1]);
});

test('«رجوع» in the sheet goes back to the list; «إغلاق» closes it', async () => {
  await openClosedThread();
  await choose(names.lesson_reminder_plain);
  const backs = screen.getAllByRole('button', { name: t.common.back });
  const sheetBack = backs[backs.length - 1];
  if (!sheetBack) throw new Error('no back in the sheet');
  await fireEvent.press(sheetBack);
  expect(await screen.findByText(names.lesson_reminder_meet)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.common.close }));
  await waitFor(() => expect(screen.queryByText(names.lesson_reminder_meet)).toBeNull());
  expect(screen.queryByText(t.inbox.composer.chooseTemplate)).toBeNull();
});
