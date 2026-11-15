import { camMicFromAndroid, fromAndroid, mediaWish } from './cam-mic';

test('Android answers: never_ask_again is blocked, anything but granted is denied', () => {
  expect(fromAndroid('granted')).toBe('granted');
  expect(fromAndroid('never_ask_again')).toBe('blocked');
  expect(fromAndroid('denied')).toBe('denied');
  expect(fromAndroid(undefined)).toBe('denied');
  expect(camMicFromAndroid('granted', 'never_ask_again')).toEqual({
    mic: 'granted',
    cam: 'blocked',
  });
});

test('joining turns on only what was allowed and left on', () => {
  const allowed = { mic: 'granted', cam: 'granted' } as const;
  expect(mediaWish(allowed, { mic: true, cam: false })).toEqual({ mic: true, cam: false });
  expect(mediaWish({ mic: 'denied', cam: 'granted' }, { mic: true, cam: true })).toEqual({
    mic: false,
    cam: true,
  });
});
