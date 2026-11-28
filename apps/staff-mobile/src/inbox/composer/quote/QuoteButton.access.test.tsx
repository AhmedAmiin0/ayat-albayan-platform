import { fireEvent, screen } from '@testing-library/react-native';
import { t, pathKey } from '@ab/mobile-kit';
import { bulkSa } from '@/finance/pricing/fixtures';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { fullAccessMe } from '@/test/staff-me';
import { detail, inbound, thread } from '@/inbox/shared/thread-fixtures';
import { ThreadModeProvider } from '@/inbox/thread/hooks/thread-mode';
import { ThreadScreen } from '@/inbox/screens/ThreadScreen';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ phone: '+966501234567' }),
}));

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();

async function open(opts: { teacher?: boolean; permissions?: string[]; last?: string } = {}) {
  const th = detail([inbound], {
    thread: { ...thread, last_inbound_at: opts.last ?? minutesAgo(5) },
  });
  mockApi.onRead(async ({ path: p }) =>
    p.startsWith('/pricing/quote')
      ? bulkSa
      : p === '/messages/gate'
        ? { open: true, reason: null, queued: 0 }
        : th,
  );
  const client = createTestQueryClient();
  if (opts.permissions)
    client.setQueryData(pathKey('/auth/me'), { role: 'sales', permissions: opts.permissions });
  const ui = <ThreadScreen />;
  await renderWithQuery(
    opts.teacher ? (
      <ThreadModeProvider value={{ kind: 'teacher', teacherId: 't1' }}>{ui}</ThreadModeProvider>
    ) : (
      ui
    ),
    client,
  );
  await screen.findByText(inbound.body ?? '');
}
const quote = () => screen.queryByRole('button', { name: t.inbox.quote.open });
const paperclip = async () => {
  const clip = screen.queryByRole('button', { name: t.inbox.composer.attach });
  if (clip) await fireEvent.press(clip);
  return clip;
};

beforeEach(() => mockApi.reset('read'));

test('sales with pricing.read get «عرض سعر» in the bar; it opens the quote sheet', async () => {
  await open({ permissions: fullAccessMe('sales').permissions });
  const button = quote();
  expect(button).toBeTruthy();
  if (button) await fireEvent.press(button);
  expect(await screen.findByTestId('quote-sheet')).toBeTruthy();
});

test('the closed window keeps the button (the sheet still copies)', async () => {
  await open({ last: minutesAgo(25 * 60) });
  expect(quote()).toBeTruthy();
});

test('no «عرض سعر» for a teacher, nor for a role without pricing.read', async () => {
  await open({ teacher: true });
  expect(await paperclip()).toBeNull();
  expect(quote()).toBeNull();
  await open({ permissions: ['inbox.read', 'inbox.send'] });
  expect(await paperclip()).toBeTruthy();
  expect(screen.getByTestId('attach-sheet')).toBeTruthy();
  expect(quote()).toBeNull();
});
