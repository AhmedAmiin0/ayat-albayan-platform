import en from '@ab/shared/i18n/en.json';
import { fireEvent, screen } from '@testing-library/react-native';
import { pathKey } from '@/core/lib/query/query-keys';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { leftToRight } from '../shared/physical-row.helpers';
import { detail, inbound, thread } from '../shared/thread-fixtures';
import { ThreadScreen } from '../screens/ThreadScreen';

// An English phone (LTR): the box on the left, the price tag and paperclip, the round button on the right.
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: jest.fn(),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ phone: '+966552147730' }),
}));

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const gate = { open: true, reason: null, queued: 0 };
const c = en.inbox.composer;

async function show(lastInbound: string, permissions?: string[]) {
  const th = { ...thread, last_inbound_at: lastInbound, reply_line: 'chat' as const };
  mockApiFetch.mockImplementation(async (p: string) => (p === '/messages/gate' ? gate : detail([inbound], { thread: th })));
  const client = createTestQueryClient();
  if (permissions) client.setQueryData(pathKey('/auth/me'), { role: 'sales', permissions });
  await renderWithQuery(<ThreadScreen />, client);
  await screen.findByText(inbound.body ?? '');
}

const shown = (names: string[]) => names.filter((n) => n !== '?');

test('open window with pricing.read: [text] [price tag] [paperclip] [round], left → right; nothing else', async () => {
  await show(ago(5));
  expect(leftToRight(screen.getByTestId('open-row'), false)).toEqual(['composer-pill', 'round-action']);
  expect(shown(leftToRight(screen.getByTestId('composer-pill'), false))).toEqual([c.placeholder, 'quote-button', c.attach]);
});

test('open window without pricing.read: [text] [paperclip] [round]; typing keeps them and shows «Send»', async () => {
  await show(ago(5), ['inbox.read', 'inbox.send']);
  await fireEvent.changeText(screen.getByLabelText(c.placeholder), 'Hello');
  expect(shown(leftToRight(screen.getByTestId('composer-pill'), false))).toEqual([c.placeholder, c.attach]);
  expect(screen.getByRole('button', { name: c.send })).toBeTruthy();
});

test('closed window: the icons on the left, the note, «Send template» on the right', async () => {
  await show(ago(3 * 24 * 60));
  const order = shown(leftToRight(screen.getByTestId('closed-row'), false));
  expect(order).toEqual([en.savedReplies.open, 'quote-button', 'closed-note', c.sendTemplate]);
});
