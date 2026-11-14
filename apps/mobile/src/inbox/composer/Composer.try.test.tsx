import type { TemplateView } from '@ab/shared';
import { screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { detail, inbound, plainReminder, thread } from '@/inbox/shared/thread-fixtures';
import { ThreadScreen } from '@/inbox/screens/ThreadScreen';

// Owner 2026-11-14 («reopen like Kapso»): after the 24 h window a known chat shows the reopen bar.
// A Kapso chat line (try_after_window) keeps the box under it: staff texts are held as before.
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

const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3_600_000).toISOString();
const CLOSED = { ...thread, last_inbound_at: threeDaysAgo, session_open: false };
const GATE = { open: true, reason: null, queued: 0 };
const WELCOME: TemplateView = {
  ...plainReminder, key: 'welcome_greeting', meta_name: 'welcome_greeting',
  body_ar: 'أهلًا بكم', params: [], line: 'chat', sales_starter: true,
};
const ANSWERS: Record<string, unknown> = { '/messages/gate': GATE };

async function open(th: typeof thread, templates: TemplateView[] = [WELCOME]) {
  const answers: Record<string, unknown> = { ...ANSWERS, '/messaging/templates': templates };
  const page = detail([inbound], { thread: th });
  mockApiFetch.mockImplementation(async (p: string) => answers[p] ?? page);
  await renderWithQuery(<ThreadScreen />, createTestQueryClient());
  await screen.findByText(inbound.body ?? '');
}

beforeEach(() => mockApiFetch.mockReset());

test('a Kapso chat line after the window: the reopen bar over the box and the paperclip', async () => {
  await open({ ...CLOSED, try_after_window: true });
  expect(await screen.findByText(t.inbox.reopenBar.closed)).toBeTruthy();
  expect(screen.getByRole('button', { name: t.inbox.reopenBar.action })).toBeTruthy();
  expect(screen.getByLabelText(t.inbox.composer.placeholder)).toBeTruthy();
  expect(screen.getByRole('button', { name: t.inbox.composer.attach })).toBeTruthy();
  expect(screen.queryByTestId('closed-row')).toBeNull();
});

test('a reopen template live: «sent» with its tick, texts still held, no button', async () => {
  const sent = { id: 'm-reopen', template_key: 'welcome_greeting', status: 'delivered' as const };
  await open({ ...CLOSED, try_after_window: true, reopen_sent: sent });
  expect(await screen.findByText(t.inbox.reopenBar.sent)).toBeTruthy();
  const tick = t.inbox.reopenBar.status.replace('{status}', t.enums.messageStatus.delivered);
  expect(screen.getByText(tick)).toBeTruthy();
  expect(screen.getByText(t.inbox.reopenBar.held)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.inbox.reopenBar.action })).toBeNull();
  expect(screen.getByLabelText(t.inbox.composer.placeholder)).toBeTruthy();
});

test('a meta chat line after the window: the bar, no box, «أرسل قالبًا» (any template) under it', async () => {
  await open(CLOSED);
  expect(await screen.findByRole('button', { name: t.inbox.reopenBar.action })).toBeTruthy();
  expect(screen.queryByLabelText(t.inbox.composer.placeholder)).toBeNull();
  expect(screen.getByTestId('closed-row')).toBeTruthy();
  expect(screen.queryByTestId('closed-note')).toBeNull();
});

test('no template allowed at all: the help line, no button', async () => {
  await open(CLOSED, []);
  expect(await screen.findByText(t.inbox.composer.noAllowedHelp)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.inbox.reopenBar.action })).toBeNull();
});

test('an open window: no bar', async () => {
  await open({ ...thread, last_inbound_at: new Date().toISOString(), session_open: true });
  expect(screen.queryByTestId('reopen-bar')).toBeNull();
});
