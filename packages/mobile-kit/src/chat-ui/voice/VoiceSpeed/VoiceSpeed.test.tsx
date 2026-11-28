import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '../../../lib/i18n/i18n';
import { VoiceSpeed } from './VoiceSpeed';

test('the chip shows its rate, names it for the screen reader and presses', async () => {
  const onPress = jest.fn();
  await render(<VoiceSpeed rate={1.5} onPress={onPress} />);
  expect(screen.getByText('1.5×')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText(t.inbox.playbackSpeed.replace('{rate}', '1.5×')));
  expect(onPress).toHaveBeenCalledTimes(1);
});
