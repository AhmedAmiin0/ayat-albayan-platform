import { fireEvent, screen, within } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { detail, inbound, thread } from './thread-fixtures';
import { ThreadScreen } from './ThreadScreen';

// The one-row composer (owner 2026-10-18): [template] [text] [send], one-line notes, a compact closed state.
const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: jest.fn(),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ phone: '+966552147730' }),
}));

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
const OPEN = { ...thread, last_inbound_at: minutesAgo(5), reply_line: 'chat' as const };
const CLOSED = { ...thread, last_inbound_at: minutesAgo(3 * 24 * 60) };
type Gate = { open: boolean; reason: 'switch_off' | 'env_off' | null; queued: number };

async function open(th: typeof thread, gate: Gate = { open: true, reason: null, queued: 0 }) {
  mockApiFetch.mockImplementation(async (p: string) => (p === '/messages/gate' ? gate : detail([inbound], { thread: th })));
  await renderWithQuery(<ThreadScreen />, createTestQueryClient());
  await screen.findByText(inbound.body ?? '');
}

beforeEach(() => mockApiFetch.mockReset());

test('open window: template and send are icon buttons beside the box; the template icon opens the sheet', async () => {
  await open(OPEN);
  const box = screen.getByLabelText(t.inbox.composer.placeholder);
  expect(box.props.style.maxHeight).toBe(120);
  expect(screen.getByRole('button', { name: t.inbox.composer.send })).toBeTruthy();
  expect(screen.queryByText(t.inbox.composer.sendTemplate)).toBeNull(); // no full-width ghost button
  expect(screen.queryByText(t.inbox.composer.send)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.sendTemplate }));
  expect(await screen.findByText(t.inbox.composer.chooseTemplate)).toBeTruthy();
});

test('open window: the line and the window’s end are one line each', async () => {
  await open(OPEN);
  expect(screen.getByTestId('line-note').props.numberOfLines).toBe(1);
  const until = screen.getByTestId('session-until');
  expect(until.props.numberOfLines).toBe(1);
  expect(until.props.accessibilityLabel).toMatch(new RegExp(t.inbox.sessionOpenUntil.replace(' {time}', '')));
});

test('closed window: one compact note beside a labelled «أرسل قالبًا», no free-text box', async () => {
  await open(CLOSED);
  expect(screen.queryByLabelText(t.inbox.composer.placeholder)).toBeNull();
  const note = screen.getByText(t.inbox.sessionClosed);
  expect(note.props.testID).toBe('closed-note');
  expect(note.props.numberOfLines).toBe(2);
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.sendTemplate }));
  expect(await screen.findByText(t.inbox.composer.chooseTemplate)).toBeTruthy();
});

test('sending off: GateNote is one line, read whole by a screen reader, and a tap shows it whole', async () => {
  await open(OPEN, { open: false, reason: 'switch_off', queued: 2 });
  const gate = await screen.findByRole('button', { name: t.inbox.messagingOff });
  expect(within(gate).getByText(t.inbox.messagingOff).props.numberOfLines).toBe(1);
  await fireEvent.press(gate);
  expect(within(gate).getByText(t.inbox.messagingOff).props.numberOfLines).toBeUndefined();
  expect(gate.props.accessibilityState).toMatchObject({ expanded: true });
});
