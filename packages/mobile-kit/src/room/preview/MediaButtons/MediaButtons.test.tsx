import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '../../../lib/i18n/i18n';
import { CameraButton, MicButton } from './MediaButtons';

const C = t.mobileRoom.controls;

test.each([
  [true, false],
  [false, true],
])('the mic reads as selected while muted (on %s)', async (on, selected) => {
  const onPress = jest.fn();
  await render(<MicButton on={on} onPress={onPress} />);
  const button = screen.getByRole('button', { name: C.mute });
  expect(button.props.accessibilityState).toEqual(expect.objectContaining({ selected }));
  await fireEvent.press(button);
  expect(onPress).toHaveBeenCalledTimes(1);
});

test.each([
  [true, true],
  [false, false],
])('the camera reads as selected while on (on %s)', async (on, selected) => {
  await render(<CameraButton on={on} onPress={jest.fn()} />);
  const button = screen.getByRole('button', { name: C.camera });
  expect(button.props.accessibilityState).toEqual(expect.objectContaining({ selected }));
});
