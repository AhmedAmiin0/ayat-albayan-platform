import { t } from '@/core/lib/i18n/i18n';
import { CATEGORIES } from '../shared/fixtures';
import { activeCategories, categoryLabel } from './categories';

test('a known key shows the table label, a seeded key its word, an unknown key itself', () => {
  expect(categoryLabel(CATEGORIES, 'rent')).toBe('إيجار');
  expect(categoryLabel(undefined, 'ads')).toBe('إعلانات');
  expect(categoryLabel(CATEGORIES, 'zzz')).toBe('zzz');
});

test('only active categories are offered; the seeded ones stand in while none have loaded', () => {
  expect(activeCategories(CATEGORIES).map((c) => c.key)).toEqual(['ads', 'rent']);
  expect(activeCategories(undefined).map((c) => c.key)).toContain('rent');
  expect(activeCategories([]).length).toBe(Object.keys(t.enums.expenseCategory).length);
});
