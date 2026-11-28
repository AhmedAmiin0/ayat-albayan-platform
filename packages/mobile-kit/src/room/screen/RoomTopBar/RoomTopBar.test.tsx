import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '../../../lib/i18n/i18n';
import { tile, withInsets } from '../../state/room-test-kit';
import { RoomTopBar } from './RoomTopBar';

const count = (n: number) => t.mobileRoom.count.replace('{n}', String(n));

test('before the room: only the title, below the status bar', async () => {
  await render(withInsets(<RoomTopBar title="حلقة الفجر" live={null} />));
  expect(screen.getByRole('header', { name: 'حلقة الفجر' })).toBeTruthy();
  expect(screen.queryByTestId('room-recording')).toBeNull();
  expect(screen.queryByRole('button')).toBeNull();
});

test('in a recorded room: the recording notice and the people pill', async () => {
  const openPeople = jest.fn();
  const live = { people: [tile()], openPeople, recording: true, elapsed: '01:05' };
  await render(withInsets(<RoomTopBar title="حلقة" live={live} />));
  expect(screen.getByTestId('room-recording')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: count(1) }));
  expect(openPeople).toHaveBeenCalledTimes(1);
});

test('in a room that is not recorded: the people pill alone', async () => {
  const live = { people: [], openPeople: jest.fn(), recording: false, elapsed: null };
  await render(withInsets(<RoomTopBar title="حلقة" live={live} />));
  expect(screen.queryByTestId('room-recording')).toBeNull();
  expect(screen.getByRole('button', { name: count(0) })).toBeTruthy();
});
