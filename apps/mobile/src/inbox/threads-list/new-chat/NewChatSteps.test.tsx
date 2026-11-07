import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { plainReminder } from '@/inbox/shared/thread-fixtures';
import { NewChatSheet } from '@/inbox/threads-list/NewChatSheet';
import { ApiError } from '@ab/client-core';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }));

const OPENER = { ...plainReminder, key: 'follow_up_slots', params: ['student_name'], body_ar: 'السلام عليكم، موعد {{1}}' };
const PEOPLE = { guardian: null, lead: null, students: [] };
const EMPTY = { thread: null, messages: [], has_more: false, lessons: [], people: PEOPLE };
const THREAD = '/threads/%2B966501234567';
const ROW = { id: 'm1', direction: 'out', status: 'queued', body: 'x', created_at: '2026-11-06T10:00:00Z' };

function serve(detail: unknown) {
  mockApiFetch.mockImplementation(async (path: string) => (path === '/messaging/templates' ? [OPENER] : detail));
}

async function typeNumber() {
  await renderWithQuery(<NewChatSheet />);
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.newChat.title }));
  await fireEvent.changeText(screen.getByLabelText(t.inbox.newChat.phone), '0501234567');
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.newChat.next }));
}

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset();
  jest.mocked(router.push).mockReset();
});

// Owner 2026-11-06: «manage new chat like kapso»: number → template → params → send, in one sheet.
test('a new number: its templates, the params, «أرسل» sends once and opens the new chat', async () => {
  serve(EMPTY);
  mockApiSend.mockResolvedValue(ROW);
  await typeNumber();
  expect(mockApiFetch).toHaveBeenCalledWith(THREAD);
  await fireEvent.press(await screen.findByText(t.templates.names.follow_up_slots));
  await fireEvent.changeText(screen.getByLabelText(t.inbox.composer.paramNames.student_name), 'سهيلة');
  const send = screen.getByRole('button', { name: t.inbox.composer.send });
  await fireEvent.press(send);
  await fireEvent.press(send);
  await waitFor(() => expect(router.push).toHaveBeenCalledWith('/inbox/thread/%2B966501234567'));
  expect(mockApiSend).toHaveBeenCalledTimes(1);
  expect(mockApiSend).toHaveBeenCalledWith('POST', `${THREAD}/template`, {
    key: 'follow_up_slots',
    params: { '1': 'سهيلة' },
    clientRequestId: expect.stringMatching(/^[0-9a-f-]{36}$/),
  });
  expect(screen.queryByLabelText(t.inbox.newChat.phone)).toBeNull();
  expect(screen.queryByText(t.templates.names.follow_up_slots)).toBeNull();
});

test('a number that has a chat opens it, as WhatsApp: no template step, nothing sent', async () => {
  serve({ ...EMPTY, thread: { phone: '+966501234567' }, messages: [ROW] });
  await typeNumber();
  await waitFor(() => expect(router.push).toHaveBeenCalledWith('/inbox/thread/%2B966501234567'));
  expect(screen.queryByText(t.inbox.composer.chooseTemplate)).toBeNull();
  expect(screen.queryByLabelText(t.inbox.newChat.phone)).toBeNull();
  expect(mockApiFetch).not.toHaveBeenCalledWith('/messaging/templates');
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('a refused send stays on the form in words; nothing opens', async () => {
  serve(EMPTY);
  mockApiSend.mockRejectedValue(new ApiError(422, null));
  await typeNumber();
  await fireEvent.press(await screen.findByText(t.templates.names.follow_up_slots));
  await fireEvent.changeText(screen.getByLabelText(t.inbox.composer.paramNames.student_name), 'سهيلة');
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.send }));
  expect(await screen.findByText(t.inbox.error.send_failed)).toBeTruthy();
  expect(router.push).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: t.inbox.composer.send })).toBeTruthy();
});
