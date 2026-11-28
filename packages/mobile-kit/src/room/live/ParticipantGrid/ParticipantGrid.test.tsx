import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '../../../lib/i18n/i18n';
import { fakePlatform, tile } from '../../state/room-test-kit';
import type { RoomTile } from '../../model/room-types';
import { ParticipantGrid } from './ParticipantGrid';

const S = t.classroom.stage;
const { Video } = fakePlatform();
const ME = tile({ key: 'me:camera', local: true, name: 'Me' });
const SHARE = tile({ key: 'p1:screen', screen: true, video: {} });

function draw(tiles: readonly RoomTile[]) {
  const actions = { front: true, switchCamera: jest.fn() };
  return render(<ParticipantGrid tiles={tiles} Video={Video} actions={actions} />).then(
    () => actions,
  );
}

test('alone in the room: one tile and the waiting line', async () => {
  await draw([ME]);
  expect(screen.getByTestId('room-tile-me:camera')).toBeTruthy();
  expect(screen.getByText(t.classroom.waiting)).toBeTruthy();
});

test('with someone else: both tiles and no waiting line', async () => {
  await draw([ME, tile()]);
  expect(screen.getByTestId('room-tile-p1:camera')).toBeTruthy();
  expect(screen.queryByText(t.classroom.waiting)).toBeNull();
});

test('zooming a share gives it the whole grid until it is shrunk back', async () => {
  await draw([ME, tile(), SHARE]);
  await fireEvent.press(screen.getByRole('button', { name: S.maximize }));
  expect(screen.queryByTestId('room-tile-me:camera')).toBeNull();
  expect(screen.queryByTestId('room-tile-p1:camera')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: S.minimize }));
  expect(screen.getByTestId('room-tile-me:camera')).toBeTruthy();
});

test('the zoom ends when the share stops', async () => {
  await draw([ME, SHARE]);
  await fireEvent.press(screen.getByRole('button', { name: S.maximize }));
  await screen.rerender(
    <ParticipantGrid
      tiles={[ME]}
      Video={Video}
      actions={{ front: true, switchCamera: jest.fn() }}
    />,
  );
  expect(screen.getByTestId('room-tile-me:camera')).toBeTruthy();
  expect(screen.getByText(t.classroom.waiting)).toBeTruthy();
});
