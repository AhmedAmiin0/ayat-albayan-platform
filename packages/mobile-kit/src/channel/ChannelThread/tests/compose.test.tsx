import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '../../../lib/i18n/i18n';
import type * as FrameModule from '../../../ui/layout/KeyboardFrame/KeyboardFrame';
import { freshQueryClient, renderWithQuery } from '../../../testing/query';
import { ChannelThread } from '../ChannelThread';
import type { ChannelMediaPort, ChannelPickedFile } from '../../media-port';
import { channelPage } from '../../testing/channel-fixtures';
import { mockCall } from '@ab/testing/mock-call';

// The composer per the ChatX boards: the pending row, the emoji panel, the attach tiles, the clock.
const mockApi = mockCall();
jest.mock('../../../lib/http/api', () => ({
  ...jest.requireActual('../../../lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));

const mockFrames: (boolean | undefined)[] = [];
jest.mock('../../../ui/layout/KeyboardFrame/KeyboardFrame', () => {
  const actual = jest.requireActual<typeof FrameModule>(
    '../../../ui/layout/KeyboardFrame/KeyboardFrame',
  );
  return {
    ...actual,
    KeyboardFrame: (p: Parameters<typeof actual.KeyboardFrame>[0]) => {
      mockFrames.push(p.inScreen);
      return actual.KeyboardFrame(p);
    },
  };
});

const c = t.studentChannel;
const PATH = '/portal/students/s1/channel/messages';
const open = (media: ChannelMediaPort = {}) =>
  renderWithQuery(
    <ChannelThread refs={{ audience: 'portal', studentId: 's1' }} media={media} />,
    freshQueryClient(),
  );

beforeEach(() => {
  mockApi.reset('read');
  mockApi.onRead(() => channelPage());
  mockApi.reset('write');
  mockApi.onWrite(() => ({}));
});

test('a send shows at once as «جارٍ الإرسال…»; a failure takes it away and keeps the words', async () => {
  let fail: (e: Error) => void = () => undefined;
  mockApi.onWrite(({ method: _m, path }) =>
    path === PATH ? new Promise((_r, reject) => (fail = reject)) : Promise.resolve({}),
  );
  await open();
  await fireEvent.changeText(await screen.findByLabelText(c.messageLabel), 'السلام عليكم');
  await fireEvent.press(screen.getByRole('button', { name: c.send }));
  expect(await screen.findByText(c.sending)).toBeTruthy();
  await act(async () => fail(new Error('down')));
  expect(await screen.findByText(c.sendFailed)).toBeTruthy();
  expect(screen.queryByText(c.sending)).toBeNull();
  expect(screen.getByDisplayValue('السلام عليكم')).toBeTruthy();
});

test('the emoji panel: its button opens the grid, a tap adds the emoji, «لوحة المفاتيح» back', async () => {
  await open();
  await fireEvent.changeText(await screen.findByLabelText(c.messageLabel), 'شكرًا');
  await fireEvent.press(screen.getByRole('button', { name: c.emoji }));
  expect(screen.getByTestId('channel-emoji')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '🌹' }));
  expect(screen.getByDisplayValue('🌹شكرًا')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: c.keyboard }));
  expect(screen.queryByTestId('channel-emoji')).toBeNull();
});

test('the attach sheet: the tiles the app offers (the camera too) and what the chat takes', async () => {
  const photo: ChannelPickedFile = {
    ...{ mime: 'image/jpeg', name: 'photo.jpg', size: 3, bytes: new ArrayBuffer(3) },
  };
  const pickCamera = jest.fn(async () => null);
  await open({ pickPhoto: async () => photo, pickCamera });
  await fireEvent.press(await screen.findByRole('button', { name: c.media.attach }));
  expect(screen.getByText(c.media.hint)).toBeTruthy();
  expect(screen.queryByRole('button', { name: c.media.document })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: c.media.camera }));
  await waitFor(() => expect(pickCamera).toHaveBeenCalled());
});

test('recording: the dot and the clock the app’s recorder tells', async () => {
  const recorder = {
    ...{ start: jest.fn(async () => true), stop: jest.fn(async () => null) },
    ...{ cancel: jest.fn(), elapsedMs: () => 7000 },
  };
  await open({ recorder });
  await fireEvent.press(await screen.findByRole('button', { name: c.media.record }));
  expect(await screen.findByTestId('rec-dot')).toBeTruthy();
  expect(screen.getByTestId('rec-time')).toHaveTextContent(/0:07/);
});

test('in a sheet the keyboard frame starts at the window top (no inset offset)', async () => {
  const frameOf = async (frame: 'screen' | 'sheet') => {
    mockFrames.length = 0;
    await renderWithQuery(
      <ChannelThread refs={{ audience: 'portal', studentId: 's1' }} frame={frame} />,
      freshQueryClient(),
    );
    await screen.findByLabelText(c.messageLabel);
    return mockFrames.at(-1);
  };
  expect(await frameOf('screen')).toBe(true);
  expect(await frameOf('sheet')).toBe(false);
});
