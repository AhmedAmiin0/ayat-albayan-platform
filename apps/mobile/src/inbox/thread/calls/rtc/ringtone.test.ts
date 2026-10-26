import { RING_PATTERN, startRingtone } from './ringtone';

test('rings in a repeating calm pattern until stopped', () => {
  const vibration = { vibrate: jest.fn(), cancel: jest.fn() };
  const tone = startRingtone(vibration);
  expect(vibration.vibrate).toHaveBeenCalledWith(RING_PATTERN, true);
  tone.stop();
  expect(vibration.cancel).toHaveBeenCalled();
});
