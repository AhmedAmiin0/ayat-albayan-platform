import { fireEvent, render, screen } from '@testing-library/react-native';
import { Waveform } from './Waveform';

const base = { seed: 'm1', progress: 0.2, label: 'voice' };
const touch = (x: number) => ({ nativeEvent: { locationX: x } });
const layout = { nativeEvent: { layout: { width: 200 } } };

test('before loading the bars are hidden from the screen reader', async () => {
  await render(<Waveform {...base} onSeek={jest.fn()} />);
  const wave = screen.getByTestId('voice-wave', { includeHiddenElements: true });
  expect(wave.props.accessible).toBe(false);
  expect(wave.props.accessibilityValue).toBeUndefined();
});

test('once loaded the screen reader adjusts the position by 5 seconds', async () => {
  const onStep = jest.fn();
  const seek = { now: 12.6, max: 65.2, text: '0:13 / 1:05', onStep };
  await render(<Waveform {...base} onSeek={jest.fn()} seek={seek} />);
  const wave = screen.getByTestId('voice-wave', { includeHiddenElements: true });
  expect(wave.props.accessibilityValue).toEqual({ min: 0, max: 65, now: 13, text: seek.text });
  await fireEvent(wave, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
  await fireEvent(wave, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
  expect(onStep.mock.calls).toEqual([[5], [-5]]);
});

test('a drag seeks once, on release, from the reading start (the right in Arabic)', async () => {
  const onSeek = jest.fn();
  await render(<Waveform {...base} onSeek={onSeek} />);
  const wave = screen.getByTestId('voice-wave', { includeHiddenElements: true });
  await fireEvent(wave, 'layout', layout);
  await fireEvent(wave, 'responderGrant', touch(150));
  await fireEvent(wave, 'responderMove', touch(50));
  expect(onSeek).not.toHaveBeenCalled();
  await fireEvent(wave, 'responderRelease');
  expect(onSeek).toHaveBeenCalledWith(0.75);
});

test('a release with no drag and a taken-over drag do not seek', async () => {
  const onSeek = jest.fn();
  await render(<Waveform {...base} onSeek={onSeek} />);
  const wave = screen.getByTestId('voice-wave', { includeHiddenElements: true });
  await fireEvent(wave, 'responderRelease');
  await fireEvent(wave, 'responderGrant', touch(20));
  await fireEvent(wave, 'responderTerminate');
  await fireEvent(wave, 'responderRelease');
  expect(onSeek).not.toHaveBeenCalled();
});
