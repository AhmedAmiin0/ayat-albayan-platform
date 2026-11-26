import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '../../../lib/i18n/i18n';
import { VoiceRow } from './VoiceRow';

const row = { id: 'v1', kind: 'رسالة صوتية', busy: false, progress: 0, clock: '0:07' };

test('play names the kind; the speed chip only once it plays', async () => {
  const onToggle = jest.fn();
  await render(<VoiceRow {...row} playing={false} onToggle={onToggle} onSeek={jest.fn()} />);
  await fireEvent.press(screen.getByLabelText(t.inbox.playMedia.replace('{kind}', row.kind)));
  expect(onToggle).toHaveBeenCalled();
  expect(screen.queryByTestId('voice-speed')).toBeNull();
  expect(screen.getByText('0:07')).toBeTruthy();
});

test('playing: pause, and the speed chip steps the rate', async () => {
  const onPress = jest.fn();
  const speed = { rate: 1.5 as const, onPress };
  await render(<VoiceRow {...row} playing speed={speed} onToggle={jest.fn()} onSeek={jest.fn()} />);
  expect(screen.getByLabelText(t.inbox.pauseMedia)).toBeTruthy();
  await fireEvent.press(screen.getByTestId('voice-speed'));
  expect(onPress).toHaveBeenCalled();
  expect(screen.getByText('1.5×')).toBeTruthy();
});
