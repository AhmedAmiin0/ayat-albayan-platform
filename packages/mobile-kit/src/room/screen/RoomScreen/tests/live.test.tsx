import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import {
  CREDS,
  fakePlatform,
  LESSON,
  tile,
  withInsets,
  type FakePlatform,
} from '../../../state/room-test-kit';
import { palette } from '../../../../theme';
import { t } from '../../../../lib/i18n/i18n';
import type { RoomChat } from '../RoomScreen';
import { RoomScreen } from '../RoomScreen';

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
  await press(t.portal.app.child.chatUnread.replace('{n}', '2'));
  expect(open).toHaveBeenCalled();
});

test('a trial lesson: the family reads «تُفتح المحادثة…»; the staff app shows no control', async () => {
  const open = jest.fn();
  await live({ chat: { unread: 1, open, whenLocked: 'explain' }, open: false });
  await press(R.controls.chat);
  expect(screen.getByText(t.studentChannel.closed)).toBeTruthy();
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

test('the caption is a solid inverse chip with onInverse ink (#bug: 2.3–3.4:1 on a scrim)', async () => {
  await live();
  await act(async () => p.client.push({ tiles: [tile()] }));
  const all = { includeHiddenElements: true };
  expect(screen.getByTestId('tile-caption', all)).toHaveStyle({
    backgroundColor: palette.light.inverse,
  });
  expect(screen.getByTestId('tile-caption-name', all)).toHaveStyle({
    color: palette.light.onInverse,
  });
});

test('muted by the teacher: «كتمك المعلم» and how to turn it back on; one’s own «كتم» is quiet', async () => {
  await live();
  const line = `${t.classroom.mute.byStaff}\n${R.mutedHint}`;
  await act(async () => p.client.push({ micOn: false }));
  expect(screen.getByText(line)).toBeTruthy();
  await act(async () => p.client.push({ micOn: true }));
  expect(screen.queryByText(line)).toBeNull();
  await press(R.controls.mute);
  await act(async () => p.client.push({ micOn: false }));
  expect(screen.queryByText(line)).toBeNull();
});

test('«جارٍ التسجيل» carries the elapsed time as a timer', async () => {
  await live();
  await act(async () => p.client.push({ recording: true }));
  const pill = within(screen.getByTestId('room-recording'));
  expect(pill.getByRole('timer')).toHaveTextContent(/00:0\d/);
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
