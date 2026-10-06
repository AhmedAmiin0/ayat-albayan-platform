import { t } from '@/lib/i18n';
import { badgeText } from './tab-badge';

test('no badge at zero or while nothing has loaded', () => {
  expect(badgeText(undefined)).toBeUndefined();
  expect(badgeText(0)).toBeUndefined();
});

test('the unread-thread count as is', () => {
  expect(badgeText(3)).toBe('3');
});

test('past 99 it reads 99+', () => {
  expect(badgeText(99)).toBe('99');
  expect(badgeText(100)).toBe(t.mobileNav.badgeOverflow.replace('{n}', '99'));
  expect(badgeText(100)).toBe('99+');
});
