import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { TreeBaseProvider } from '@/core/nav/tree-base';
import { renderWithQuery } from '@/test/query';
import { NewChatSheet } from './NewChatSheet';
import { InboxHeaderActions } from './InboxHeaderActions';
import { plainReminder } from '../shared/thread-fixtures';
import { ThreadScreen } from '../screens/ThreadScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ phone: '+966501234567' }),
}));

const OPENER = { ...plainReminder, key: 'follow_up_slots', params: ['student_name'], body_ar: 'السلام عليكم، موعد {{1}}' };
const EMPTY = { thread: null, messages: [], has_more: false, lessons: [], people: { guardian: null, lead: null, students: [] } };

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset();
});

// Owner 2026-10-27 («This topbar takes alot of space»): a 44pt compose icon, no text button.
test('«محادثة جديدة» is a named 44pt icon button beside the sales bell; it opens the same sheet', async () => {
  await renderWithQuery(
    <TreeBaseProvider value="/sales">
      <InboxHeaderActions base="/sales" />
    </TreeBaseProvider>,
  );
  const trigger = screen.getByRole('button', { name: t.inbox.newChat.title });
  expect(trigger).toHaveStyle({ width: 44, height: 44 });
  expect(screen.queryByText(t.inbox.newChat.title)).toBeNull();
  await fireEvent.press(trigger);
  expect(screen.getByLabelText(t.inbox.newChat.phone)).toBeTruthy();
  expect(screen.getByRole('header', { name: t.inbox.newChat.title })).toBeTruthy();
});

// Owner report 2026-10-12 («it is not able to start the conversation»): the same path as the web.
test('«محادثة جديدة»: a bad number is refused in words; a local Saudi number opens its thread as E.164', async () => {
  await renderWithQuery(<NewChatSheet />);
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.newChat.title }));
  const box = screen.getByLabelText(t.inbox.newChat.phone);
  await fireEvent.changeText(box, 'abc');
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.newChat.open }));
  expect(screen.getByRole('alert').props.children).toBe(t.common.phoneErrors.not_a_number);
  expect(router.push).not.toHaveBeenCalled();
  await fireEvent.changeText(box, '0501234567');
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.newChat.open }));
  expect(router.push).toHaveBeenCalledWith('/inbox/thread/%2B966501234567');
});

test('a number with no message yet: the first-template note, the approved templates, the send queues it', async () => {
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path === '/messaging/templates') return [OPENER];
    if (path === '/messages/gate') return { open: true, reason: null, queued: 0 };
    return EMPTY;
  });
  mockApiSend.mockReturnValue(new Promise(() => undefined));
  await renderWithQuery(<ThreadScreen />);
  expect(await screen.findByText(t.inbox.newChat.firstTemplate)).toBeTruthy();
  expect(screen.queryByLabelText(t.inbox.composer.placeholder)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.sendTemplate }));
  await fireEvent.press(await screen.findByText(t.templates.names.follow_up_slots));
  await fireEvent.changeText(screen.getByLabelText(t.inbox.composer.paramNames.student_name), 'سهيلة');
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.send }));
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/threads/%2B966501234567/template', {
    key: 'follow_up_slots',
    params: { '1': 'سهيلة' },
    clientRequestId: expect.stringMatching(/^[0-9a-f-]{36}$/),
  });
});
