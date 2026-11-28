import { render, screen } from '@testing-library/react-native';
import { t } from '../../../lib/i18n/i18n';
import { CameraButton } from './CameraButton';

test.each([
  [true, true],
  [false, false],
])('the camera reads as selected while on (on %s)', async (on, selected) => {
  await render(<CameraButton on={on} onPress={jest.fn()} />);
  const button = screen.getByRole('button', { name: t.mobileRoom.controls.camera });
  expect(button.props.accessibilityState).toEqual(expect.objectContaining({ selected }));
});
