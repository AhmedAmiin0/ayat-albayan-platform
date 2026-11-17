import { I18nManager } from 'react-native';
import { screenAnimation } from './screen-animation';

test('Arabic slides in from the left on Android, English from the right', () => {
  expect(screenAnimation(true)).toBe('slide_from_left');
  expect(screenAnimation(false)).toBe('slide_from_right');
});

test('reads the running direction by default', () => {
  const rtl = jest.replaceProperty(I18nManager, 'isRTL', true);
  expect(screenAnimation()).toBe('slide_from_left');
  rtl.restore();
});
