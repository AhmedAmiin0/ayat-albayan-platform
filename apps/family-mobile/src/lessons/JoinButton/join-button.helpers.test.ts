import { t } from '@ab/mobile-kit';
import { idleWord, pressStyle } from './join-button.helpers';

test('a row says the short word; the card says join, or join now while live', () => {
  expect(idleWord(true, true)).toBe(t.portal.app.lesson.joinShort);
  expect(idleWord(false, false)).toBe(t.portal.join);
  expect(idleWord(false, true)).toBe(t.portal.app.live.join);
});

test('the row pill is shorter; a busy one is dimmed', () => {
  const row = pressStyle({ short: true, busy: true, fill: 'fill' })({ pressed: false });
  expect(row).toMatchObject({ minHeight: 44, opacity: 0.7, backgroundColor: 'fill' });
  const card = pressStyle({ short: false, busy: false, fill: 'fill' })({ pressed: true });
  expect(card).toMatchObject({ minHeight: 48, opacity: 1 });
});
