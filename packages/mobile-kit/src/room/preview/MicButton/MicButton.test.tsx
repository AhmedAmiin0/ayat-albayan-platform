import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '../../../lib/i18n/i18n';
import { MicButton } from './MicButton';

test.each([
  [true, false],
  [false, true],
])('the mic reads as selected while muted (on %s)', async (on, selected) => {
  const onPress = jest.fn();
  await render(<MicButton on={on} onPress={onPress} />);
  const button = screen.getByRole('button', { name: t.mobileRoom.controls.mute });
  expect(button.props.accessibilityState).toEqual(expect.objectContaining({ selected }));
  await fireEvent.press(button);
  expect(onPress).toHaveBeenCalledTimes(1);
});
