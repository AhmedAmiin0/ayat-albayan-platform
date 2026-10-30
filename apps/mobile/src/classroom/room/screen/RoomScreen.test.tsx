import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { handOff } from '@/classroom/room/model/join-handoff';
import {
  CREDS,
  fakePlatform,
  LESSON,
  tile,
  withInsets,
  type FakePlatform,
} from '@/classroom/room/state/room-test-kit';
import { t } from '@/core/lib/i18n/i18n';
import { RoomScreen } from './RoomScreen';

const R = t.mobileRoom;
let p: FakePlatform;
const fetchJoin = jest.fn(async () => CREDS);
const onExit = jest.fn();
const mount = () =>
  render(
    withInsets(<RoomScreen platform={p} target={LESSON} onExit={onExit} fetchJoin={fetchJoin} />),
  );
const press = async (label: string) =>
  fireEvent.press(await screen.findByRole('button', { name: label }));

beforeEach(() => {
  jest.clearAllMocks();
  p = fakePlatform();
});

test("allowed already: the preview with one's camera, then «انضم الآن» joins with the handed-over token", async () => {
  handOff(LESSON, CREDS);
  await mount();
  expect(await screen.findByTestId('preview-cam-1')).toBeTruthy();
  await press(R.preview.join);
  expect(fetchJoin).not.toHaveBeenCalled();
  expect(p.client.connect).toHaveBeenCalledWith(CREDS, { mic: true, cam: true });
  expect(p.stopPreview).toHaveBeenCalled();
  expect(p.audio.start).toHaveBeenCalled();
  expect(p.audio.route).toHaveBeenCalledWith(true);
  const tiles = [tile(), tile({ key: 'me:camera', local: true, video: {} })];
  await act(async () => p.client.push({ status: 'connected', micOn: true, camOn: true, tiles }));
  expect(screen.getByTestId('room-grid')).toBeTruthy();
  expect(screen.getByTestId('video-mirrored')).toBeTruthy();
  expect(screen.getByText(R.count.replace('{n}', '2'))).toBeTruthy();
  expect(screen.getByLabelText('سهيلة')).toBeTruthy();
  expect(screen.queryByText(t.classroom.waiting)).toBeNull();
});

test('the preview toggles decide what joining turns on; no token handed over asks the API', async () => {
  await mount();
  await screen.findByTestId('preview-cam-1');
  await press(R.controls.mute);
  await press(R.controls.camera);
  expect(await screen.findByText(R.preview.camOff)).toBeTruthy();
  await press(R.preview.join);
  expect(fetchJoin).toHaveBeenCalledWith(LESSON);
  expect(p.client.connect).toHaveBeenCalledWith(CREDS, { mic: false, cam: false });
});

test('not allowed yet: the MSA explanation, then the system dialog; a refusal joins without it', async () => {
  p = fakePlatform({ mic: 'denied', cam: 'denied' }, { mic: 'granted', cam: 'denied' });
  await mount();
  expect(await screen.findByText(R.permission.body)).toBeTruthy();
  await press(R.permission.allow);
  expect(p.media.ask).toHaveBeenCalled();
  expect(await screen.findByTestId('room-notice-denied')).toBeTruthy();
  expect(p.openPreview).not.toHaveBeenCalled();
  await press(R.preview.join);
  expect(p.client.connect).toHaveBeenCalledWith(CREDS, { mic: true, cam: false });
});

test('«لا تسأل مجددًا»: the blocked notice offers the settings', async () => {
  p = fakePlatform({ mic: 'denied', cam: 'denied' }, { mic: 'blocked', cam: 'granted' });
  await mount();
  await press(R.permission.allow);
  expect(await screen.findByRole('button', { name: R.permission.openSettings })).toBeTruthy();
});

test('«تابع دونهما» never asks and joins with both off', async () => {
  p = fakePlatform({ mic: 'denied', cam: 'denied' });
  await mount();
  await press(R.permission.skip);
  expect(p.media.ask).not.toHaveBeenCalled();
  expect(await screen.findByTestId('room-preview')).toBeTruthy();
  await press(R.preview.join);
  expect(p.client.connect).toHaveBeenCalledWith(CREDS, { mic: false, cam: false });
});
