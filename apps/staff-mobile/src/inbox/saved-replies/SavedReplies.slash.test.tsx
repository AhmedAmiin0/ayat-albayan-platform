import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { savedProfile } from '@/test/account';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { detail, inbound, thread } from '@/inbox/shared/thread-fixtures';
import { ThreadScreen } from '@/inbox/screens/ThreadScreen';
import { MINE, REPLIES, WELCOME } from './testing/fixtures';
import { clearComposerDrafts } from '@/inbox/composer/draft-store';
import { mockCall } from '@ab/testing/mock-call';

/** The signed-in staff member the composer greets with. */
const ME = savedProfile({ full_name: 'سارة' });

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ phone: '+966552147730' }),
}));

async function open() {
  const th = detail([inbound], {
    thread: { ...thread, last_inbound_at: new Date(Date.now() - 5 * 60_000).toISOString() },
  });
  mockApi.onRead(async ({ path: p }) =>
    p === '/saved-replies'
      ? REPLIES
      : p === '/me/profile'
        ? ME
        : p === '/messages/gate'
          ? { open: true, reason: null, queued: 0 }
          : th,
  );
  await renderWithQuery(<ThreadScreen />, createTestQueryClient());
  await screen.findByText(inbound.body ?? '');
}
const box = () => screen.getByLabelText(t.inbox.composer.placeholder);
const docked = () => screen.queryByTestId('slash-suggestions');
async function type(...steps: string[]) {
  for (const step of steps) await fireEvent.changeText(box(), step);
}

// Drafts outlive a chat until sign-out: each test starts with an empty box.
afterEach(() => clearComposerDrafts());

beforeEach(() => {
  mockApi.reset('read');
  mockApi.reset('write');
});

test('«/» docks the list over the composer (no sheet): both tabs, «/title» first, filtered live', async () => {
  await open();
  await type('/');
  const list = await screen.findByTestId('slash-suggestions');
  expect(screen.queryByTestId('saved-replies-sheet')).toBeNull();
  await within(list).findByRole('button', { name: WELCOME.title });
  expect(within(list).getByRole('button', { name: MINE.title })).toBeTruthy();
  expect(within(list).getByText(`⁨/${WELCOME.title}⁩`)).toBeTruthy();
  await type('/تر');
  await waitFor(() => expect(within(list).queryByRole('button', { name: MINE.title })).toBeNull());
  expect(within(list).getByRole('button', { name: WELCOME.title })).toBeTruthy();
});

test('deleting the «/» or leaving the box closes the list', async () => {
  await open();
  await type('/', '/تر', '');
  expect(docked()).toBeNull();
  await type('/');
  expect(docked()).not.toBeNull();
  await fireEvent(box(), 'blur');
  expect(docked()).toBeNull();
});

test('a tap replaces the «/search» with the reply and sends nothing', async () => {
  await open();
  await type('سطر\n', 'سطر\n/', 'سطر\n/تر');
  await fireEvent.press(await screen.findByRole('button', { name: WELCOME.title }));
  expect(box().props.value).toBe(`سطر\n${WELCOME.body}`);
  expect(docked()).toBeNull();
  expect(mockApi.writes()).toHaveLength(0);
});

test('no match: one line says so', async () => {
  await open();
  await type('/', '/لا يوجد');
  expect(await screen.findByText(t.savedReplies.noMatch)).toBeTruthy();
});
