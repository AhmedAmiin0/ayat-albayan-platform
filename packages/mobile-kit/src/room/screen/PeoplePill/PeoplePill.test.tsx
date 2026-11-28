import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '../../../lib/i18n/i18n';
import { tile } from '../../state/room-test-kit';
import { PeoplePill } from './PeoplePill';

const people = ['a', 'b', 'c', 'd'].map((k) => tile({ key: `${k}:camera`, name: k }));

test('reads how many are in the room and opens the people list', async () => {
  const onPress = jest.fn();
  await render(<PeoplePill people={people} onPress={onPress} />);
  const pill = screen.getByRole('button', { name: t.mobileRoom.count.replace('{n}', '4') });
  expect(screen.getByText('4')).toBeTruthy();
  await fireEvent.press(pill);
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('an empty room reads zero', async () => {
  await render(<PeoplePill people={[]} onPress={jest.fn()} />);
  expect(screen.getByRole('button', { name: t.mobileRoom.count.replace('{n}', '0') })).toBeTruthy();
});
