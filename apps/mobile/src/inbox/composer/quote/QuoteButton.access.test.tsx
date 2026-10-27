import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';
import { bulkSa } from '@/finance/pricing/fixtures';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { fullAccessMe } from '@/test/staff-me';
import { detail, inbound, thread } from '../../shared/thread-fixtures';
import { ThreadModeProvider } from '../../thread/hooks/thread-mode';
import { ThreadScreen } from '../../screens/ThreadScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ phone: '+966501234567' }),
}));

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();

async function open(opts: { teacher?: boolean; permissions?: string[]; last?: string } = {}) {
  const th = detail([inbound], { thread: { ...thread, last_inbound_at: opts.last ?? minutesAgo(5) } });
  mockApiFetch.mockImplementation(async (p: string) =>
    p.startsWith('/pricing/quote') ? bulkSa : p === '/messages/gate' ? { open: true, reason: null, queued: 0 } : th,
  );
  const client = createTestQueryClient();
  if (opts.permissions) client.setQueryData(pathKey('/auth/me'), { role: 'sales', permissions: opts.permissions });
  const ui = <ThreadScreen />;
  await renderWithQuery(opts.teacher ? <ThreadModeProvider value={{ kind: 'teacher', teacherId: 't1' }}>{ui}</ThreadModeProvider> : ui, client);
  await screen.findByText(inbound.body ?? '');
}
const quote = () => screen.queryByRole('button', { name: t.inbox.quote.open });
/** Open window (owner 2026-10-27): «عرض سعر» is a tile of the paperclip's sheet. */
const paperclip = async () => {
  const clip = screen.queryByRole('button', { name: t.inbox.composer.attach });
  if (clip) await fireEvent.press(clip);
  return clip;
};

beforeEach(() => mockApiFetch.mockReset());

test('sales with pricing.read get «عرض سعر» in the paperclip’s sheet; it opens the quote sheet', async () => {
  await open({ permissions: fullAccessMe('sales').permissions });
  await paperclip();
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
