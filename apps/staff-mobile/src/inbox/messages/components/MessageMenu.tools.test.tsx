import type { MessageView } from '@ab/shared';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { ApiError, t } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { ChatActionsProvider } from '@/inbox/thread/components/ChatActionsProvider';
import { ChatNotice } from '@/inbox/thread/components/ChatNotice';
import { MessageBubble } from './MessageBubble';
import { message, PHONE, thread } from '@/inbox/shared/thread-fixtures';
import { mockCall } from '@ab/testing/mock-call';

// Copy and download are JS only: no clipboard module.
const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));

const BODY = 'السلام عليكم\nموعد الحلقة غدًا الساعة ٥';
const DOWNLOAD = '/threads/%2B966552147730/messages/f1/file?download=1';
const SIGNED = 'https://storage.test/wa-media/f1.pdf?token=x&download=a.pdf';
const text = message({
  id: 'm1',
  direction: 'inbound',
  status: 'delivered',
  body: BODY,
  replyable: true,
  forwardable: true,
});
const pdf = message({
  id: 'f1',
  direction: 'inbound',
  status: 'delivered',
  body: null,
  media_mime: 'application/pdf',
  media_name: 'خطة الحفظ.pdf',
  forwardable: false,
});
const openURL = jest.spyOn(Linking, 'openURL');

async function longPress(m: MessageView) {
  await renderWithQuery(
    <ChatActionsProvider phone={PHONE} thread={thread}>
      <MessageBubble message={m} phone={PHONE} />
      <ChatNotice />
    </ChatActionsProvider>,
  );
  await fireEvent(screen.getByTestId(`bubble-${m.id}`), 'longPress');
  return within(screen.getByTestId('message-menu'));
}
/** Each button's spoken name: its accessibilityLabel, else its text. */
const labels = (menu: ReturnType<typeof within>) =>
  menu
    .getAllByRole('button')
    .map((b) => b.props.accessibilityLabel ?? within(b).getByText(/.+/).props.children);

beforeEach(() => {
  jest.useFakeTimers();
  mockApi.reset('read');
  mockApi.onRead(async ({ path }) =>
    path === DOWNLOAD ? { url: SIGNED, mime: 'application/pdf', expires_at: '' } : null,
  );
  openURL.mockReset().mockResolvedValue(true);
});
afterEach(() => jest.useRealTimers());

test('a text message: «نسخ النص» after «رد», no «تنزيل»; it opens the sheet with the exact, selectable text', async () => {
  const menu = await longPress(text);
  expect(labels(menu)).toEqual([
    t.inbox.reply.action,
    t.inbox.copy.label,
    t.inbox.forward.action,
    t.inbox.hide.action,
    t.common.cancel,
  ]);
  await fireEvent.press(menu.getByRole('button', { name: t.inbox.copy.label }));
  await act(async () => jest.runOnlyPendingTimers());
  const copied = screen.getByTestId('copy-text');
  expect(copied.props.selectable).toBe(true);
  expect(copied.props.children).toBe(BODY);
  // No long-press handler on the sheet: the OS selection gets the press.
  expect(copied.props.onLongPress).toBeUndefined();
});

test('a file: «تنزيل» last, no «نسخ النص»; it asks a fresh download URL and hands it to the browser', async () => {
  const menu = await longPress(pdf);
  const name = t.inbox.download.label.replace('{name}', 'خطة الحفظ.pdf');
  expect(labels(menu)).toEqual([name, t.inbox.hide.action, t.common.cancel]);
  await fireEvent.press(menu.getByRole('button', { name }));
  expect(mockApi.reads()).toContainEqual({ method: 'GET', path: DOWNLOAD });
  await waitFor(() => expect(openURL).toHaveBeenCalledWith(SIGNED));
});

test('a refused download keeps today’s «غير مسموح» text, in the chat notice', async () => {
  mockApi.onRead(async ({ path }) => {
    if (path === DOWNLOAD) throw new ApiError(403, { code: 'media_forbidden' });
    return null;
  });
  const menu = await longPress(pdf);
  await fireEvent.press(
    menu.getByRole('button', { name: t.inbox.download.label.replace('{name}', 'خطة الحفظ.pdf') }),
  );
  expect(await screen.findByText(t.inbox.mediaNotAllowed)).toBeTruthy();
  expect(openURL).not.toHaveBeenCalled();
});
