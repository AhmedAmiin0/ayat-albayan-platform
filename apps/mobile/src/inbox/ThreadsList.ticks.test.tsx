import type { ThreadView } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { InboxScreen } from './InboxScreen';
import { thread } from './thread-fixtures';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

// Like WhatsApp's chat list: ticks before the preview only when the last message is ours.
const ours: ThreadView = { ...thread, display_name: 'أم سارة', last_status: 'read', last_body: 'أهلًا' };
const theirs: ThreadView = {
  ...thread,
  phone_e164: '+966552147731',
  display_name: 'أم إيمان',
  last_direction: 'inbound',
  last_body: 'شكرًا',
  unread_count: 1,
};
const page = (items: ThreadView[]) => ({ items, total: items.length, page: 1, pageSize: 25 });
const row = (name: string) => screen.getByRole('button', { name: new RegExp(name) });
const hidden = { includeHiddenElements: true };

beforeEach(() => {
  mockApiFetch.mockReset();
  jest.mocked(router.push).mockReset();
});

test('our last message carries its ticks; the row (one stop) says the status word', async () => {
  mockApiFetch.mockResolvedValue(page([ours, theirs]));
  await renderWithQuery(<InboxScreen />);
  await screen.findByText('أم سارة');
  expect(row(`أم سارة.*${t.enums.messageStatus.read} · ${t.inbox.you} أهلًا`)).toBeTruthy();
  // The ticks add no stop of their own.
  expect(screen.queryByLabelText(t.enums.messageStatus.read)).toBeNull();
  expect(screen.getByTestId('ticks-read', hidden)).toBeTruthy();
});

test('a tap on the ticks opens the thread, as anywhere on the row', async () => {
  mockApiFetch.mockResolvedValue(page([ours]));
  await renderWithQuery(<InboxScreen />);
  await screen.findByText('أم سارة');
  const ticks = screen.getByTestId('ticks-read', hidden);
  // Nothing in the ticks takes the touch (RNTL would bubble a press past a nested Pressable anyway).
  expect(ticks.props.onStartShouldSetResponder).toBeUndefined();
  await fireEvent.press(ticks);
  expect(router.push).toHaveBeenCalledTimes(1);
});

test('their last message shows no ticks; the unread chip stays', async () => {
  mockApiFetch.mockResolvedValue(page([theirs]));
  await renderWithQuery(<InboxScreen />);
  await screen.findByText('أم إيمان');
  expect(screen.queryByTestId(/^ticks-/)).toBeNull();
  expect(screen.getByText(t.inbox.unread.one)).toBeTruthy();
});

test('a failed last send: the saffron «!» before the preview, «لم تُرسل» said once (the chip)', async () => {
  mockApiFetch.mockResolvedValue(page([{ ...ours, last_status: 'failed' }]));
  await renderWithQuery(<InboxScreen />);
  await screen.findByText('أم سارة');
  expect(screen.getByTestId('ticks-failed', hidden)).toBeTruthy();
  expect(screen.getAllByText(t.enums.messageStatus.failed, hidden)).toHaveLength(1);
});
