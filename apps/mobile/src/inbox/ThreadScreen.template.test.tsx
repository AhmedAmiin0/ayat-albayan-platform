import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { detail, inbound, meetReminder, notApproved, plainReminder, thread } from './thread-fixtures';
import { ThreadScreen } from './ThreadScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ phone: '+966552147730' }),
}));

const names = t.templates.names;
const twoDaysAgo = new Date(Date.now() - 2 * 24 * 3_600_000).toISOString();
const closed = detail([inbound], { thread: { ...thread, last_inbound_at: twoDaysAgo, session_open: true } });

async function openClosedThread() {
  mockApiFetch.mockImplementation(async (path: string) =>
    path === '/messaging/templates' ? [plainReminder, meetReminder, notApproved] : closed,
  );
  await renderWithQuery(<ThreadScreen />);
  await screen.findByText(inbound.body ?? '');
}
const field = (n: string) => screen.getByLabelText(t.inbox.composer.param.replace('{n}', n));
const sendButton = () => screen.getByRole('button', { name: t.inbox.composer.send });

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset();
});

test('after 24 h (by the clock, whatever the cached flag): no free text, the reason verbatim', async () => {
  await openClosedThread();
  expect(screen.getByText('فات أكتر من 24 ساعة على آخر رسالة منه — لازم تبعت قالب')).toBeTruthy();
  expect(screen.queryByLabelText(t.inbox.composer.placeholder)).toBeNull();
});

test('the sheet lists only approved templates, by their Arabic name', async () => {
  await openClosedThread();
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.sendTemplate }));
  expect(await screen.findByText(names.lesson_reminder_plain)).toBeTruthy();
  expect(screen.getByText(names.lesson_reminder_meet)).toBeTruthy();
  expect(screen.queryByText(names.renewal_due)).toBeNull();
});

test('params fill the preview; a missing one stops the send; then it goes out optimistically', async () => {
  mockApiSend.mockReturnValue(new Promise(() => undefined));
  await openClosedThread();
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.sendTemplate }));
  await fireEvent.press(await screen.findByText(names.lesson_reminder_plain));

  await fireEvent.changeText(field('1'), 'سهيلة');
  await fireEvent.press(sendButton());
  expect(screen.getByText(t.common.required)).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
  expect(screen.getByText(/حلقة سهيلة النهاردة — \{\{2\}\}/)).toBeTruthy();

  await fireEvent.changeText(field('2'), '17:00');
  await fireEvent.press(sendButton());
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/threads/%2B966552147730/template', {
    key: 'lesson_reminder_plain',
    params: { '1': 'سهيلة', '2': '17:00' },
    clientRequestId: expect.stringMatching(/^[0-9a-f-]{36}$/),
  });
  // The sheet closed; the row is in the thread as queued, with its template name.
  await waitFor(() => expect(screen.queryByLabelText(t.inbox.composer.param.replace('{n}', '1'))).toBeNull());
  const row = screen.getByText(t.inbox.templateLine.replace('{name}', names.lesson_reminder_plain));
  expect(row).toBeTruthy();
  // Like the API's template rows: the rendered body, the footer only in the preview.
  expect(screen.getByText('حلقة سهيلة النهاردة — 17:00')).toBeTruthy();
  expect(screen.getByText(t.enums.messageStatus.queued)).toBeTruthy();
});

test('a template with a meeting link also needs its code', async () => {
  mockApiSend.mockReturnValue(new Promise(() => undefined));
  await openClosedThread();
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.sendTemplate }));
  await fireEvent.press(await screen.findByText(names.lesson_reminder_meet));
  await fireEvent.changeText(field('1'), 'سهيلة');
  await fireEvent.changeText(field('2'), '17:00');
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

test('«رجوع» in the sheet goes back to the list; «إغلاق» closes it', async () => {
  await openClosedThread();
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.sendTemplate }));
  await fireEvent.press(await screen.findByText(names.lesson_reminder_plain));
  const backs = screen.getAllByRole('button', { name: t.common.back });
  const sheetBack = backs[backs.length - 1];
  if (!sheetBack) throw new Error('no back in the sheet');
  await fireEvent.press(sheetBack);
  expect(await screen.findByText(names.lesson_reminder_meet)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.common.close }));
  await waitFor(() => expect(screen.queryByText(names.lesson_reminder_meet)).toBeNull());
  expect(screen.queryByText(t.inbox.composer.chooseTemplate)).toBeNull();
});
