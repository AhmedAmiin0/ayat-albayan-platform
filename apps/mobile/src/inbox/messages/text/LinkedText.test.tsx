import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { Linking } from 'react-native';
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
  mockApiFetch.mockReset().mockResolvedValue(null);
  openURL.mockReset().mockResolvedValue(true);
});
afterEach(() => jest.useRealTimers());

test('a link is a pressable lapis, underlined, left-to-right span that opens in the browser', async () => {
  await show();
  const link = screen.getByRole('link', { name: 'https://meet.test/ab' });
  expect(link.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ textDecorationLine: 'underline', writingDirection: 'ltr' })]));
  await fireEvent.press(link);
  expect(openURL).toHaveBeenCalledWith('https://meet.test/ab');
});

test('www. opens over https', async () => {
  await show();
  await fireEvent.press(screen.getByRole('link', { name: 'www.x.com' }));
  expect(openURL).toHaveBeenCalledWith('https://www.x.com');
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
