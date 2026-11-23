import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import {
  CREDS,
  fakePlatform,
  LESSON,
  withInsets,
  type FakePlatform,
} from '../../../state/room-test-kit';
import { ApiError } from '../../../../lib/http/api';
import { t } from '../../../../lib/i18n/i18n';
import { RoomScreen } from '../RoomScreen';

const R = t.mobileRoom;
let p: FakePlatform;
const fetchJoin = jest.fn(async () => CREDS);
const mount = (direct = false, rememberChoice = true) =>
  render(
    withInsets(
      <RoomScreen
        platform={p}
        target={LESSON}
        onExit={jest.fn()}
        fetchJoin={fetchJoin}
        direct={direct}
        rememberChoice={rememberChoice}
      />,
    ),
  );

beforeEach(() => {
  jest.clearAllMocks();
  p = fakePlatform();
});

test('the staff room (no rememberChoice) shows the preview every time, as before', async () => {
  p.devices.load.mockResolvedValue({ mic: false, cam: true });
  await mount(false, false);
  expect(await screen.findByTestId('room-preview')).toBeTruthy();
  expect(p.client.connect).not.toHaveBeenCalled();
});

test('the family room: a later join reuses the kept choice and skips the preview', async () => {
  p.devices.load.mockResolvedValue({ mic: false, cam: true });
  await mount();
  await waitFor(() =>
    expect(p.client.connect).toHaveBeenCalledWith(CREDS, { mic: false, cam: true }),
  );
  expect(screen.queryByTestId('room-preview')).toBeNull();
});

test('from the «بدأت الحلقة» push: straight in, the mic on, the camera off unless chosen', async () => {
  await mount(true);
  await waitFor(() =>
    expect(p.client.connect).toHaveBeenCalledWith(CREDS, { mic: true, cam: false }),
  );
  expect(p.devices.save).not.toHaveBeenCalled();
});

test('from the push without the permissions: only they are asked, then in', async () => {
  p = fakePlatform({ mic: 'denied', cam: 'denied' });
  await mount(true);
  await fireEvent.press(await screen.findByRole('button', { name: R.permission.allow }));
  await waitFor(() =>
    expect(p.client.connect).toHaveBeenCalledWith(CREDS, { mic: true, cam: false }),
  );
  expect(p.media.ask).toHaveBeenCalled();
});

test('a 410 lesson_ended join: «انتهت الحلقة» with no way back', async () => {
  fetchJoin.mockRejectedValueOnce(new ApiError(410, { code: 'lesson_ended' }));
  await mount(true);
  expect(await screen.findByTestId('room-closed-endedAll')).toBeTruthy();
  expect(screen.getByText(t.classroom.closedHint)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.classroom.rejoin })).toBeNull();
});

test('back from the settings with the permission given: the blocked notice goes (#bug)', async () => {
  const listeners: ((s: AppStateStatus) => void)[] = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_e, fn) => {
    listeners.push(fn);
    return { remove: jest.fn() };
  });
  p = fakePlatform({ mic: 'denied', cam: 'denied' }, { mic: 'blocked', cam: 'blocked' });
  await mount();
  await fireEvent.press(await screen.findByRole('button', { name: R.permission.allow }));
  expect(await screen.findByTestId('room-notice-blocked')).toBeTruthy();
  p.media.check.mockResolvedValue({ mic: 'granted', cam: 'granted' });
  await act(async () => listeners.forEach((l) => l('active')));
  expect(screen.queryByTestId('room-notice-blocked')).toBeNull();
  expect(await screen.findByTestId('preview-cam-1')).toBeTruthy();
});
