import { autoOutput, knownOutputs, nextOutput } from './audio-output';

test('LiveKit’s own pick: bluetooth, then a headset, then the loudspeaker', () => {
  expect(autoOutput(['speaker', 'earpiece', 'headset'])).toBe('headset');
  expect(autoOutput(['speaker', 'earpiece', 'headset', 'bluetooth'])).toBe('bluetooth');
  expect(autoOutput(['earpiece', 'speaker'])).toBe('speaker');
  expect(autoOutput([])).toBeNull();
});

test('the button steps through what the phone has, wrapping round', () => {
  const all = knownOutputs(['earpiece', 'speaker', 'bluetooth', 'usb']);
  expect(all).toEqual(['speaker', 'earpiece', 'bluetooth']);
  expect(nextOutput('speaker', all)).toBe('earpiece');
  expect(nextOutput('earpiece', all)).toBe('bluetooth');
  expect(nextOutput('bluetooth', all)).toBe('speaker');
  expect(nextOutput('headset', all)).toBe('speaker');
  expect(nextOutput(null, all)).toBe('speaker');
  expect(nextOutput('speaker', [])).toBeNull();
});
