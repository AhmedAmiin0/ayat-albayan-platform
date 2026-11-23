import { act, fireEvent, render, screen } from '@testing-library/react-native';
import {
  CREDS,
  fakePlatform,
  LESSON,
  tile,
  withInsets,
  type FakePlatform,
} from '../../../state/room-test-kit';
import { t } from '../../../../lib/i18n/i18n';
import { RoomScreen } from '../RoomScreen';

const R = t.mobileRoom;
let p: FakePlatform;
const fetchJoin = jest.fn(async () => CREDS);
const onExit = jest.fn();
const onBrowser = jest.fn();
const press = async (label: string) =>
  fireEvent.press(await screen.findByRole('button', { name: label }));

async function live() {
  await render(
    withInsets(
      <RoomScreen
        platform={p}
        target={LESSON}
        onExit={onExit}
        fetchJoin={fetchJoin}
        onBrowser={onBrowser}
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

test('alone in the room: «بانتظار البقية…»; reconnecting shows its line and keeps the grid', async () => {
  await live();
  expect(screen.getByText(t.classroom.waiting)).toBeTruthy();
  await act(async () => p.client.push({ status: 'reconnecting' }));
  expect(screen.getByTestId('room-reconnecting')).toBeTruthy();
  expect(screen.getByTestId('room-grid')).toBeTruthy();
  await act(async () => p.client.push({ status: 'connected' }));
  expect(screen.queryByTestId('room-reconnecting')).toBeNull();
});

test.each([
  // The server closed it (DeleteRoom): «انتهت الحلقة»; a rejoin learns whether it is final (410).
  ['ended', t.classroom.closedHint, true],
  ['dropped', R.dropped, true],
  ['duplicate', R.duplicate, true],
  ['removed', t.classroom.error.removed_from_room, false],
] as const)(
  'LiveKit closes the room (%s): its line, and a way back in unless removed',
  async (status, line, again) => {
    await live();
    await act(async () => p.client.push({ status }));
    expect(screen.getByTestId(`room-closed-${status}`)).toBeTruthy();
    expect(screen.getByText(line)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.classroom.rejoin }) !== null).toBe(again);
    expect(p.audio.stop).toHaveBeenCalledTimes(1);
  },
);

test('the connection dropped (#476): «ادخل مرة أخرى» joins again, its audio stays on', async () => {
  await live();
  await act(async () => p.client.push({ status: 'dropped' }));
  // LiveKit's events while the new connect runs still carry the old «dropped».
  p.client.connect.mockImplementationOnce(async () => {
    p.client.push({ micOn: true });
    p.client.push({ status: 'connected' });
  });
  await press(t.classroom.rejoin);
  await press(R.preview.join);
  expect(await screen.findByTestId('room-grid')).toBeTruthy();
  expect(p.audio.start).toHaveBeenCalledTimes(2);
  expect(p.audio.stop).toHaveBeenCalledTimes(1);
});

test('the controls: mute, camera, the switch on one’s tile, the next audio output', async () => {
  await live();
  const me = tile({ key: 'me:camera', local: true, camOn: true, video: {} });
  await act(async () => p.client.push({ tiles: [me] }));
  await press(R.controls.mute);
  expect(p.client.setMic).toHaveBeenCalledWith(false);
  await press(R.controls.switchCamera);
  expect(p.client.switchCamera).toHaveBeenCalled();
  await press(R.controls.camera);
  expect(p.client.setCamera).toHaveBeenCalledWith(false);
  await press(R.controls.output.replace('{name}', R.controls.headset));
  expect(p.audio.next).toHaveBeenLastCalledWith('headset');
  const speaker = R.controls.output.replace('{name}', R.controls.speaker);
  expect(await screen.findByRole('button', { name: speaker })).toBeTruthy();
});

test('«فتح في المتصفح» sits in the participants panel (not the header): leaves, opens the web', async () => {
  await live();
  expect(screen.queryByRole('button', { name: R.openInBrowser })).toBeNull();
  await press(R.count.replace('{n}', '0'));
  await press(R.openInBrowser);
  expect(p.client.disconnect).toHaveBeenCalled();
  expect(onBrowser).toHaveBeenCalled();
  expect(onExit).toHaveBeenCalled();
});

test('leaving the screen (back) disconnects the room', async () => {
  await live();
  await screen.unmount();
  expect(p.client.close).toHaveBeenCalled();
  expect(p.audio.stop).toHaveBeenCalled();
});

test('left while the token was awaited: the client is closed and the audio stopped', async () => {
  let give: (c: typeof CREDS) => void = () => undefined;
  fetchJoin.mockImplementationOnce(() => new Promise((r) => (give = r)));
  p.client.connect.mockRejectedValueOnce(new Error('room client closed'));
  await render(
    withInsets(
      <RoomScreen
        platform={p}
        target={LESSON}
        onExit={onExit}
        fetchJoin={fetchJoin}
        onBrowser={onBrowser}
      />,
    ),
  );
  await press(R.preview.join);
  await screen.unmount();
  expect(p.client.close).toHaveBeenCalled();
  await act(async () => give(CREDS));
  expect(p.audio.stop).toHaveBeenCalledTimes(2);
});
