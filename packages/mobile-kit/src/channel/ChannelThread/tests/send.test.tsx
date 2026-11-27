import type { ChannelPage } from '@ab/shared';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '../../../lib/i18n/i18n';
import { freshQueryClient, renderWithQuery } from '../../../testing/query';
import { ChannelThread } from '../ChannelThread';
import { channelMessage, channelPage } from '../../testing/channel-fixtures';

// docs/31 §2 bugs: clear only what was sent; one client_id per send, reused by its retry; replies.
const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('../../../lib/http/api', () => ({
  ...jest.requireActual('../../../lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

const c = t.studentChannel;
const PATH = '/teachers/me/channels/s1/messages';
const page: ChannelPage = channelPage({
  messages: [channelMessage({ body: 'الواجب: سورة النبأ', sender_name: 'فاطمة' })],
});
const posts = () => mockApiSend.mock.calls.filter(([m, p]) => m === 'POST' && p === PATH);
const lastPost = () => posts().at(-1)?.[2] as Record<string, unknown>;

/** The API's answers: the stored message for a send, nothing (204) for a read mark. */
const stored = channelMessage({ id: 'm2', body: 'السلام عليكم', mine: true });
const answerOf = (path: string) => Promise.resolve(path === PATH ? stored : undefined);

beforeEach(() => {
  mockApiFetch.mockReset().mockResolvedValue(page);
  mockApiSend.mockReset().mockImplementation((_m: string, path: string) => answerOf(path));
});

const open = async () => {
  await renderWithQuery(
    <ChannelThread refs={{ audience: 'teacher', studentId: 's1' }} />,
    freshQueryClient(),
  );
  return screen.findByLabelText(c.messageLabel);
};

test('words typed while a send is on its way stay in the box', async () => {
  let answer: (v: unknown) => void = () => undefined;
  mockApiSend.mockImplementation((_m: string, path: string) =>
    path === PATH ? new Promise((r) => (answer = r)) : answerOf(path),
  );
  const box = await open();
  await fireEvent.changeText(box, 'السلام عليكم');
  await fireEvent.press(screen.getByRole('button', { name: c.send }));
  await fireEvent.changeText(box, 'السلام عليكم ورحمة الله');
  await act(async () => answer(stored));
  await waitFor(() => expect(screen.getByDisplayValue('ورحمة الله')).toBeTruthy());
});

test('a retry of the failed text reuses its client_id', async () => {
  let failed = false;
  mockApiSend.mockImplementation(async (_m: string, path: string) => {
    if (path !== PATH || failed) return {};
    failed = true;
    throw new Error('down');
  });
  const box = await open();
  await fireEvent.changeText(box, 'شكرًا');
  await fireEvent.press(screen.getByRole('button', { name: c.send }));
  expect(await screen.findByText(c.sendFailed)).toBeTruthy();
  const first = lastPost().client_id;
  await fireEvent.press(screen.getByRole('button', { name: c.send }));
  await waitFor(() => expect(posts()).toHaveLength(2));
  expect(lastPost().client_id).toBe(first);
});

test('«ردّ» from the menu: the quote over the box, sent with reply_to_id, then gone', async () => {
  const box = await open();
  await fireEvent(screen.getByTestId('channel-bubble-m1'), 'longPress');
  await fireEvent.press(screen.getByRole('button', { name: c.reply.action }));
  expect(screen.getByTestId('reply-strip')).toBeTruthy();
  await fireEvent.changeText(box, 'سنراجعها الليلة');
  await fireEvent.press(screen.getByRole('button', { name: c.send }));
  await waitFor(() => expect(lastPost()).toMatchObject({ reply_to_id: 'm1' }));
  await waitFor(() => expect(screen.queryByTestId('reply-strip')).toBeNull());
});

test('no port: no attach, no microphone; only «أرسل»', async () => {
  await open();
  expect(screen.queryByLabelText(c.media.attach)).toBeNull();
  expect(screen.queryByLabelText(c.media.record)).toBeNull();
  expect(screen.getByRole('button', { name: c.send })).toBeDisabled();
});
