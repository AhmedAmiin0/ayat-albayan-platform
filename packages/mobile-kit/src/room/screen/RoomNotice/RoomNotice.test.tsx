import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { RoomNotice } from './RoomNotice';

test('a wait shows the message and a spinner, and no buttons', async () => {
  const again = { label: 'again', onPress: jest.fn() };
  await render(<RoomNotice testID="room-joining" message="m" busy again={again} />);
  expect(screen.getByTestId('room-joining')).toBeTruthy();
  expect(screen.getByRole('header', { name: 'm' })).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
});

test('the detail, the presence line and the icon in the cover ink', async () => {
  const icon = jest.fn((ink: string) => <Text>{ink === '' ? 'no ink' : 'icon'}</Text>);
  await render(<RoomNotice testID="n" message="m" detail="d" presence="p" icon={icon} />);
  expect(screen.getByText('d')).toBeTruthy();
  expect(screen.getByText('p')).toBeTruthy();
  expect(screen.getByText('icon')).toBeTruthy();
});

test('no detail, presence or icon: only the message', async () => {
  await render(<RoomNotice testID="n" message="m" presence={null} />);
  expect(screen.getByRole('header', { name: 'm' })).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
});

test('the buttons show under the message when it is not a wait', async () => {
  await render(<RoomNotice testID="n" message="m" onBack={jest.fn()} />);
  expect(screen.getAllByRole('button')).toHaveLength(1);
});
