import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { Linking, StyleSheet } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { ChatActionsProvider } from '../../thread/components/ChatActionsProvider';
import { MessageBubble } from '../components/MessageBubble';
import { message, PHONE, thread } from '../../shared/thread-fixtures';
import { HOLD_MS } from './use-hold-press';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

const mockStripe = { on: false };
// No spread: it would read the getter while the factory runs, before mockStripe exists.
jest.mock('@/core/lib/stripe-flag', () => ({
  appOpenUrl: jest.requireActual<{ appOpenUrl: (href: string, on: boolean) => string }>('@/core/lib/stripe-flag').appOpenUrl,
  get STRIPE_FEATURE() {
    return mockStripe.on;
  },
}));

const BODY = 'رابط الحلقة https://meet.test/ab. والموقع www.x.com';
const row = (body: string) => message({ id: 'm1', direction: 'inbound', status: 'delivered', body, replyable: true, forwardable: true });
const show = (body = BODY) =>
  renderWithQuery(
    <ChatActionsProvider phone={PHONE} thread={thread}>
      <MessageBubble message={row(body)} phone={PHONE} />
    </ChatActionsProvider>,
  );
const openURL = jest.spyOn(Linking, 'openURL');

beforeEach(() => {
  mockStripe.on = false;
  mockApiFetch.mockReset().mockResolvedValue(null);
  openURL.mockReset().mockResolvedValue(true);
});
afterEach(() => jest.useRealTimers());

test('a link is a pressable lapis, underlined span (an LRM keeps its end in place) that opens in the browser', async () => {
  await show();
  const link = screen.getByRole('link', { name: 'https://meet.test/ab' });
  const style = StyleSheet.flatten(link.props.style);
  expect(style).toMatchObject({ textDecorationLine: 'underline' });
  expect(style.writingDirection).toBeUndefined();
  expect(link.props.children).toBe('https://meet.test/ab\u200E');
  await fireEvent.press(link);
  expect(openURL).toHaveBeenCalledWith('https://meet.test/ab');
});

test('www. opens over https', async () => {
  await show();
  await fireEvent.press(screen.getByRole('link', { name: 'www.x.com' }));
  expect(openURL).toHaveBeenCalledWith('https://www.x.com');
});

test('the Stripe test build opens a pay link marked ?from=app (its page brings the payer back); others as they are', async () => {
  mockStripe.on = true;
  const pay = `https://api.example.test/pay/${'t'.repeat(32)}`;
  await show(`ادفع هنا ${pay} والموقع www.x.com`);
  await fireEvent.press(screen.getByRole('link', { name: pay }));
  expect(openURL).toHaveBeenLastCalledWith(`${pay}?from=app`);
  await fireEvent.press(screen.getByRole('link', { name: 'www.x.com' }));
  expect(openURL).toHaveBeenLastCalledWith('https://www.x.com');
});

test('a link the phone cannot open shows the generic error, never a crash', async () => {
  openURL.mockRejectedValue(new Error('no handler'));
  await show();
  await fireEvent.press(screen.getByRole('link', { name: 'www.x.com' }));
  expect(await screen.findByText(t.common.error)).toBeTruthy();
});

test('a hold on a link opens the bubble menu («رد», «إعادة توجيه») and does not open the link', async () => {
  jest.useFakeTimers();
  await show();
  const link = screen.getByRole('link', { name: 'https://meet.test/ab' });
  await fireEvent(link, 'pressIn');
  await act(async () => jest.advanceTimersByTime(HOLD_MS));
  await fireEvent(link, 'pressOut');
  await fireEvent.press(link);
  const menu = within(screen.getByTestId('message-menu'));
  expect(menu.getByRole('button', { name: t.inbox.reply.action })).toBeTruthy();
  expect(openURL).not.toHaveBeenCalled();
});

test('a plain message renders as before: one selectable-off text, no link', async () => {
  await show('السلام عليكم');
  const text = screen.getByText('السلام عليكم');
  expect(text.props.children).toBe('السلام عليكم');
  expect(text.props.selectable).toBe(false);
  expect(screen.queryByRole('link')).toBeNull();
});

// Arabic UI (jest.setup: RTL), as WhatsApp: a body sits on the side of its own language.
test('an Arabic body aligns to the start (the right); an English one to the left; no writingDirection', async () => {
  await show('السلام عليكم');
  const arabic = StyleSheet.flatten(screen.getByText('السلام عليكم').props.style);
  expect(arabic.textAlign).toBe('left'); // RN swaps left/right in RTL: the start
  expect(arabic.writingDirection).toBeUndefined();
  await show('Hello, see you at 5');
  expect(StyleSheet.flatten(screen.getByText('Hello, see you at 5').props.style).textAlign).toBe('right');
});
