import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@ab/mobile-kit';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { plainReminder } from '@/inbox/shared/thread-fixtures';
import { NewChatSheet } from '@/inbox/threads-list/NewChatSheet';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
}));

const OPENER = {
  ...plainReminder,
  key: 'follow_up_slots',
  params: ['student_name'],
  body_ar: 'السلام عليكم، موعد {{1}}',
};
const PEOPLE = { guardian: null, lead: null, students: [] };
const EMPTY = { thread: null, messages: [], has_more: false, lessons: [], people: PEOPLE };
const ME = { id: 'u1', role: 'sales', permissions: ['inbox.send', 'messages.read'] };

async function toTemplates(templates: unknown[], client = createTestQueryClient()) {
  mockApi.onRead(async ({ path }) => {
    if (path === '/auth/me') return ME;
    return path === '/messaging/templates' ? templates : EMPTY;
  });
  await renderWithQuery(<NewChatSheet />, client);
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.newChat.title }));
  await fireEvent.changeText(screen.getByLabelText(t.inbox.newChat.phone), '0501234567');
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.newChat.next }));
}

beforeEach(() => {
  mockApi.reset('read');
  mockApi.reset('write');
  jest.mocked(router.push).mockReset();
});

test('back goes one step (params → templates → the number, still typed); close forgets every step', async () => {
  await toTemplates([OPENER]);
  await fireEvent.press(await screen.findByText(t.templates.names.follow_up_slots));
  expect(screen.getByLabelText(t.inbox.composer.paramNames.student_name)).toBeTruthy();
  await fireEvent.press(screen.getByTestId('new-chat-back'));
  expect(screen.getByText(t.templates.names.follow_up_slots)).toBeTruthy();
  await fireEvent.press(screen.getByTestId('new-chat-back'));
  expect(screen.getByLabelText(t.inbox.newChat.phone).props.value).toBe('0501234567');
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.newChat.next }));
  await fireEvent.press(await screen.findByText(t.templates.names.follow_up_slots));
  await fireEvent.press(screen.getByRole('button', { name: t.common.close }));
  expect(screen.queryByLabelText(t.inbox.composer.paramNames.student_name)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.newChat.title }));
  expect(screen.getByLabelText(t.inbox.newChat.phone).props.value).toBe('');
  expect(mockApi.writes()).toHaveLength(0);
  expect(router.push).not.toHaveBeenCalled();
});

test('sales with no template allowed reads «noAllowed», with nothing to send', async () => {
  await toTemplates([], createTestQueryClient({ meFromApi: true }));
  expect(await screen.findByText(t.inbox.composer.noAllowed)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.inbox.composer.send })).toBeNull();
  expect(screen.queryByText(t.inbox.newChat.firstTemplate)).toBeNull();
  expect(mockApi.writes()).toHaveLength(0);
});

test('while «أرسل» is on its way, close waits for it (no second first template)', async () => {
  mockApi.onWrite(() => new Promise(() => undefined));
  await toTemplates([OPENER]);
  await fireEvent.press(await screen.findByText(t.templates.names.follow_up_slots));
  await fireEvent.changeText(
    screen.getByLabelText(t.inbox.composer.paramNames.student_name),
    'سهيلة',
  );
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.send }));
  expect(await screen.findByText(t.inbox.newChat.sending)).toBeTruthy();
  expect(screen.getByRole('button', { name: t.common.close })).toBeDisabled();
  expect(mockApi.writes()).toHaveLength(1);
});
