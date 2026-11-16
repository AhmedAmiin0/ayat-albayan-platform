import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SCRIM_INK } from '@/classroom/room/live/TileCaption';
import {
  CREDS,
  fakePlatform,
  LESSON,
  tile,
  withInsets,
  type FakePlatform,
} from '@/classroom/room/state/room-test-kit';
import { palette, t } from '@ab/mobile-kit';
import type { RoomChat } from './RoomScreen';
import { RoomScreen } from './RoomScreen';

const R = t.mobileRoom;
let p: FakePlatform;
const press = async (label: string) =>
  fireEvent.press(await screen.findByRole('button', { name: label }));

async function live(o: { chat?: RoomChat; open?: boolean } = {}) {
  const fetchJoin = jest.fn(async () => ({ ...CREDS, chat: o.open ?? true }));
  await render(
    withInsets(
      <RoomScreen
        platform={p}
        target={LESSON}
        onExit={jest.fn()}
        fetchJoin={fetchJoin}
        chat={o.chat}
      />,
    ),
  );
  await press(R.preview.join);
  await act(async () => p.client.push({ status: 'connected', micOn: true, camOn: true }));
}

beforeEach(() => {
  jest.clearAllMocks();
  p = fakePlatform();
});

test('«المحادثة» shows its unread count and opens the student channel', async () => {
  const open = jest.fn();
  await live({ chat: { unread: 2, open, whenLocked: 'hide' } });
  const badge = screen.getByTestId('room-chat-unread', { includeHiddenElements: true });
  expect(badge).toHaveTextContent('2');
  await press(R.controls.chat);
  expect(open).toHaveBeenCalled();
});

test('a trial lesson: the family reads «تُفتح المحادثة…»; the staff app shows no control', async () => {
  const open = jest.fn();
  await live({ chat: { unread: 1, open, whenLocked: 'explain' }, open: false });
  await press(R.controls.chat);
  expect(screen.getByText(R.chatLocked)).toBeTruthy();
  expect(open).not.toHaveBeenCalled();
  await screen.unmount();
  await live({ chat: { unread: 1, open, whenLocked: 'hide' }, open: false });
  expect(screen.queryByRole('button', { name: R.controls.chat })).toBeNull();
});

test('«جارٍ التسجيل» while LiveKit records', async () => {
  await live();
  expect(screen.queryByTestId('room-recording')).toBeNull();
  await act(async () => p.client.push({ recording: true }));
  expect(screen.getByText(t.classroom.recordingNow)).toBeTruthy();
});

test('a shared screen fits whole (#bug: cropped), and «تكبير» gives it the grid', async () => {
  await live();
  const share = tile({ key: 'p1:screen', screen: true, video: {} });
  await act(async () => p.client.push({ tiles: [tile(), share] }));
  expect(screen.getByTestId('video-contain')).toBeTruthy();
  await press(t.classroom.stage.maximize);
  expect(screen.queryByTestId('room-tile-p1:camera')).toBeNull();
  await press(t.classroom.stage.minimize);
  expect(screen.getByTestId('room-tile-p1:camera')).toBeTruthy();
});

test('the caption is light ink on the scrim in the light theme too (#bug)', async () => {
  await live();
  await act(async () => p.client.push({ tiles: [tile()] }));
  expect(SCRIM_INK).toBe(palette.dark.coverInk);
  const caption = screen.getByTestId('tile-caption', { includeHiddenElements: true });
  expect(caption).toHaveStyle({ color: SCRIM_INK });
});

test('one’s own camera is mirrored again after a rejoin with the back camera (#bug)', async () => {
  await live();
  const me = tile({ key: 'me:camera', local: true, camOn: true, video: {} });
  await act(async () => p.client.push({ tiles: [me] }));
  await press(R.controls.switchCamera);
  expect(await screen.findByTestId('video-cover')).toBeTruthy();
  await act(async () => p.client.push({ status: 'dropped' }));
  await press(t.classroom.rejoin);
  await press(R.preview.join);
  await act(async () => p.client.push({ status: 'connected' }));
  expect(await screen.findByTestId('video-mirrored')).toBeTruthy();
});
