import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { EMPTY_SNAPSHOT, type RoomSnapshot } from '../../model/room-types';
import { fakePlatform, tile } from '../../state/room-test-kit';
import { RoomLive } from './RoomLive';

const { Video } = fakePlatform();
const MUTED_LINE = `${t.classroom.mute.byStaff}\n${t.mobileRoom.mutedHint}`;

const controls = (mutedByStaff: boolean) => ({
  toggleMic: jest.fn(),
  toggleCam: jest.fn(),
  nextOutput: jest.fn(),
  openChat: jest.fn(),
  leave: jest.fn(),
  output: null,
  front: true,
  switchCamera: jest.fn(),
  mutedByStaff,
});

function draw(snap: Partial<RoomSnapshot>, mutedByStaff = false) {
  const shown: RoomSnapshot = { ...EMPTY_SNAPSHOT, status: 'connected', tiles: [tile()], ...snap };
  return render(
    <RoomLive
      snap={shown}
      Video={Video}
      controls={controls(mutedByStaff)}
      chatUnread={null}
      sheet={<Text>sheet</Text>}
    />,
  );
}

test('connected: the grid, the controls and the sheet, with no banner', async () => {
  await draw({});
  expect(screen.getByTestId('room-grid')).toBeTruthy();
  expect(screen.getByRole('button', { name: t.mobileRoom.controls.leave })).toBeTruthy();
  expect(screen.getByText('sheet')).toBeTruthy();
  expect(screen.queryByTestId('room-reconnecting')).toBeNull();
  expect(screen.queryByText(MUTED_LINE)).toBeNull();
});

test('reconnecting: a banner says so', async () => {
  await draw({ status: 'reconnecting' });
  expect(screen.getByTestId('room-reconnecting')).toHaveTextContent(t.classroom.reconnecting);
});

test('muted by the teacher: a notice says how to turn the mic back on', async () => {
  await draw({}, true);
  expect(screen.getByText(MUTED_LINE)).toBeTruthy();
});
