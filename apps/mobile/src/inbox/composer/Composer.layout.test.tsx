import { fireEvent, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { shape, type } from '@/theme';
import { sessionUntil } from '../messages/hooks/message-text';
import { detail, inbound, thread } from '../shared/thread-fixtures';
import { ThreadScreen } from '../screens/ThreadScreen';

// The one-row composer (owner 2026-10-18; 2026-10-27 as WhatsApp): [pill] [round], notes never cut, a compact closed state.
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

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
const OPEN = { ...thread, last_inbound_at: minutesAgo(5), reply_line: 'chat' as const };
const CLOSED = { ...thread, last_inbound_at: minutesAgo(3 * 24 * 60) };
type Gate = { open: boolean; reason: 'switch_off' | 'not_configured' | null; queued: number };

async function open(th: typeof thread, gate: Gate = { open: true, reason: null, queued: 0 }) {
  mockApiFetch.mockImplementation(async (p: string) => (p === '/messages/gate' ? gate : detail([inbound], { thread: th })));
  await renderWithQuery(<ThreadScreen />, createTestQueryClient());
  await screen.findByText(inbound.body ?? '');
}

beforeEach(() => mockApiFetch.mockReset());

test('open window: one pill with the box, «أرسل» once there is text; the template sits in the paperclip’s sheet', async () => {
  await open(OPEN);
  const box = screen.getByLabelText(t.inbox.composer.placeholder);
  expect(box.props.style.maxHeight).toBe(120);
  expect(screen.queryByText(t.inbox.composer.send)).toBeNull(); // an icon, not a label
  expect(screen.getByRole('button', { name: t.inbox.composer.send }).props.accessibilityState).toMatchObject({ disabled: true });
  await fireEvent.changeText(box, 'السلام عليكم');
  expect(screen.getByRole('button', { name: t.inbox.composer.send }).props.accessibilityState).toMatchObject({ disabled: false });
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.attach }));
  await fireEvent.press(within(screen.getByTestId('attach-sheet')).getByRole('button', { name: t.inbox.composer.modeTemplate }));
  expect(await screen.findByText(t.inbox.composer.chooseTemplate)).toBeTruthy();
});

test('open window: the notes are never cut (owner 2026-10-27): they wrap or stack', async () => {
  await open(OPEN);
  expect(StyleSheet.flatten(screen.getByTestId('composer-notes').props.style)).toMatchObject({ flexDirection: 'row', flexWrap: 'wrap' });
  const line = screen.getByTestId('line-note');
  expect(line.props.numberOfLines).toBeUndefined();
  expect(StyleSheet.flatten(line.props.style).flexShrink).toBe(1);
  const until = screen.getByTestId('session-until');
  expect(until.props.numberOfLines).toBeUndefined();
  expect(StyleSheet.flatten(until.props.style).flexShrink).toBe(0);
  expect(until.props.children).toBe(sessionUntil(OPEN.last_inbound_at, { cycle: '24' }));
  expect(until.props.children).toMatch(new RegExp(t.inbox.sessionOpenUntil.replace(' {time}', '')));
});

test('open window: one line of text makes the pill exactly 44pt (26 line + 8 + 8 + the pill’s border)', async () => {
  await open(OPEN);
  const { style } = screen.getByLabelText(t.inbox.composer.placeholder).props;
  const pill = StyleSheet.flatten(screen.getByTestId('composer-pill').props.style);
  expect(style.borderWidth).toBeUndefined();
  expect(style.lineHeight).toBe(type.lineHeight(type.size.base));
  expect(style.lineHeight + 2 * style.paddingVertical + 2 * pill.borderWidth).toBe(shape.control.touch);
  expect(style.minHeight + 2 * pill.borderWidth).toBe(shape.control.touch);
  expect(pill.borderRadius).toBe(shape.radius.pill);
});

test('closed window: one compact note beside a labelled «أرسل قالبًا», no free-text box', async () => {
  await open(CLOSED);
  expect(screen.queryByLabelText(t.inbox.composer.placeholder)).toBeNull();
  const note = screen.getByText(t.inbox.sessionClosed);
  expect(note.props.testID).toBe('closed-note');
  expect(note.props.numberOfLines).toBeUndefined(); // never cut: it wraps
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
  expect(gate.props.style).toMatchObject({ minHeight: shape.control.touch, justifyContent: 'center' });
});
