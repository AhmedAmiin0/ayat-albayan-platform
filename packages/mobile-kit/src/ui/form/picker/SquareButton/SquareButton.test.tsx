import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SquareButton } from './SquareButton';

test('a named 44pt square: pressed it answers, disabled it does not', async () => {
  const onPress = jest.fn();
  await render(
    <SquareButton label="الأسبوع القادم" hint="الأسابيع" onPress={onPress}>
      <Text>›</Text>
    </SquareButton>,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'الأسبوع القادم' }));
  expect(onPress).toHaveBeenCalledTimes(1);
  await render(
    <SquareButton label="أقل" disabled onPress={onPress}>
      <Text>−</Text>
    </SquareButton>,
  );
  expect(screen.getByRole('button', { name: 'أقل' }).props.accessibilityState).toMatchObject({ disabled: true });
});
