import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import {
  CREDS,
  fakePlatform,
  LESSON,
  withInsets,
  type FakePlatform,
} from '@/classroom/room/state/room-test-kit';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { RoomScreen } from './RoomScreen';

const R = t.mobileRoom;
let p: FakePlatform;
const fetchJoin = jest.fn(async () => CREDS);
const onExit = jest.fn();
const press = async (label: string) =>
  fireEvent.press(await screen.findByRole('button', { name: label }));

async function live() {
  await render(
    withInsets(<RoomScreen platform={p} target={LESSON} onExit={onExit} fetchJoin={fetchJoin} />),
  );
  await press(R.preview.join);
  await act(async () => p.client.push({ status: 'connected', micOn: true, camOn: true }));
}

beforeEach(() => {
  jest.clearAllMocks();
  p = fakePlatform();
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
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
  ['ended', R.ended, true],
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
  },
);

test('a refused join reads the API code; «حاول مرة أخرى» goes back to the preview', async () => {
  fetchJoin.mockRejectedValueOnce(new ApiError(409, { code: 'join_closed' }));
  await render(
    withInsets(<RoomScreen platform={p} target={LESSON} onExit={onExit} fetchJoin={fetchJoin} />),
  );
  await press(R.preview.join);
  expect(await screen.findByText(t.classroom.error.join_closed)).toBeTruthy();
  expect(p.client.disconnect).toHaveBeenCalled();
  await press(t.classroom.retry);
  expect(await screen.findByTestId('room-preview')).toBeTruthy();
});

test('a connect failure says so; «رجوع» closes the screen', async () => {
  p.client.connect.mockRejectedValueOnce(new Error('ws'));
  await render(
    withInsets(<RoomScreen platform={p} target={LESSON} onExit={onExit} fetchJoin={fetchJoin} />),
  );
  await press(R.preview.join);
  expect(await screen.findByText(t.classroom.error.connect_failed)).toBeTruthy();
  await press(R.back);
  expect(onExit).toHaveBeenCalled();
});

test('the controls: mute, camera, switch camera, speaker ↔ earpiece', async () => {
  await live();
  await press(R.controls.mute);
  expect(p.client.setMic).toHaveBeenCalledWith(false);
  await press(R.controls.switchCamera);
  expect(p.client.switchCamera).toHaveBeenCalled();
  await press(R.controls.camera);
  expect(p.client.setCamera).toHaveBeenCalledWith(false);
  await press(R.controls.speaker);
  expect(p.audio.route).toHaveBeenLastCalledWith(false);
  expect(await screen.findByRole('button', { name: R.controls.earpiece })).toBeTruthy();
});

test('«غادر» leaves the room, stops the audio and closes the screen', async () => {
  await live();
  await press(R.controls.leave);
  expect(p.client.disconnect).toHaveBeenCalled();
  expect(p.audio.stop).toHaveBeenCalled();
  expect(onExit).toHaveBeenCalled();
});

test('«فتح في المتصفح» on any step: leaves and opens the web classroom', async () => {
  await live();
  await press(R.openInBrowser);
  expect(p.client.disconnect).toHaveBeenCalled();
  expect(Linking.openURL).toHaveBeenCalledWith(
    `https://app.ayatalbayan.com/classroom/${LESSON.id}`,
  );
  expect(onExit).toHaveBeenCalled();
});

test('leaving the screen (back) disconnects the room', async () => {
  await live();
  await screen.unmount();
  expect(p.client.close).toHaveBeenCalled();
  expect(p.audio.stop).toHaveBeenCalled();
});

test('left while the token was awaited: the client is closed and the audio stopped', async () => {
  let give = (_c: typeof CREDS) => undefined as void;
  fetchJoin.mockImplementationOnce(() => new Promise((r) => (give = r)));
  p.client.connect.mockRejectedValueOnce(new Error('room client closed'));
  await render(
    withInsets(<RoomScreen platform={p} target={LESSON} onExit={onExit} fetchJoin={fetchJoin} />),
  );
  await press(R.preview.join);
  await screen.unmount();
  expect(p.client.close).toHaveBeenCalled();
  await act(async () => give(CREDS));
  expect(p.audio.stop).toHaveBeenCalledTimes(2);
});
