import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '../../../lib/i18n/i18n';
import { fakePlatform, tile } from '../../state/room-test-kit';
import type { RoomTile } from '../../model/room-types';
import { ParticipantTile, type TileActions } from './ParticipantTile';

const S = t.classroom.stage;
const { Video } = fakePlatform();

function draw(shown: RoomTile, over: Partial<TileActions> = {}) {
  const actions = { front: true, switchCamera: jest.fn(), zoom: jest.fn(), zoomed: null, ...over };
  return render(<ParticipantTile tile={shown} Video={Video} actions={actions} />).then(
    () => actions,
  );
}

const label = (...parts: string[]) => screen.getByLabelText(parts.join(t.common.listSeparator));

test('reads the name, role, a muted mic and speaking; the initials while the camera is off', async () => {
  await draw(tile({ micOn: false, speaking: true }));
  const parts = [t.classroom.roles.guest, t.classroom.muted, t.classroom.speaking];
  expect(label('Suhaila', ...parts)).toBeTruthy();
  expect(screen.queryByTestId(/^video-/)).toBeNull();
  expect(screen.queryByRole('button')).toBeNull();
});

test('one’s own camera reads «you», is mirrored on the front camera and can switch', async () => {
  const me = tile({ key: 'me:camera', local: true, camOn: true, video: {} });
  const actions = await draw(me);
  expect(label(t.classroom.you, t.classroom.roles.guest)).toBeTruthy();
  expect(screen.getByTestId('video-mirrored')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.mobileRoom.controls.switchCamera }));
  expect(actions.switchCamera).toHaveBeenCalledTimes(1);
});

test('one’s own tile with the camera off or the back camera: no switch, no mirror', async () => {
  await draw(tile({ local: true, camOn: false }));
  expect(screen.queryByRole('button')).toBeNull();
  await screen.unmount();
  await draw(tile({ local: true, camOn: true, video: {} }), { front: false });
  expect(screen.getByTestId('video-cover')).toBeTruthy();
});

test('a shared screen fits whole, reads whose it is and zooms by its key', async () => {
  const share = tile({ key: 'p1:screen', screen: true, micOn: false, video: {} });
  const actions = await draw(share);
  expect(label(t.classroom.screenOf.replace('{name}', 'Suhaila'))).toBeTruthy();
  expect(screen.getByTestId('video-contain')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: S.maximize }));
  expect(actions.zoom).toHaveBeenCalledWith('p1:screen');
});

test('the zoomed share offers to shrink back', async () => {
  await draw(tile({ key: 'p1:screen', screen: true, video: {} }), { zoomed: 'p1:screen' });
  expect(screen.getByRole('button', { name: S.minimize })).toBeTruthy();
});
