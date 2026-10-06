import { t } from '@/lib/i18n';
import { badgeText } from './tab-badge';

test('no badge at zero or while nothing has loaded', () => {
  expect(badgeText()).toBeUndefined();
  expect(badgeText(undefined, undefined)).toBeUndefined();
  expect(badgeText(0, 0)).toBeUndefined();
});

test('unread threads and new leads add up', () => {
  expect(badgeText(3, undefined)).toBe('3');
  expect(badgeText(undefined, 4)).toBe('4');
  expect(badgeText(3, 4)).toBe('7');
});

test('past 99 it reads 99+', () => {
  expect(badgeText(99)).toBe('99');
  expect(badgeText(60, 40)).toBe(t.mobileNav.badgeOverflow.replace('{n}', '99'));
  expect(badgeText(60, 40)).toBe('99+');
});
