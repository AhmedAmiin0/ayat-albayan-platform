import { t } from '@/core/lib/i18n/i18n';
import { leadSortChoices, leadSortFromValue, leadSortValue } from './lead-sort';

test('every choice round-trips through its select value', () => {
  for (const { value } of leadSortChoices()) {
    expect(leadSortValue(leadSortFromValue(value))).toBe(value);
  }
});

test('«الأحدث إضافةً» is created_at descending, «الأقدم» ascending', () => {
  expect(leadSortFromValue('created_at:desc')).toEqual({ sort: 'created_at', dir: 'desc' });
  expect(leadSortFromValue('created_at')).toEqual({ sort: 'created_at' });
  expect(leadSortChoices().map((c) => c.label)).toContain(t.leads.sort.newest);
});

test('an unknown key or an empty value is the default order', () => {
  expect(leadSortFromValue('')).toEqual({});
  expect(leadSortFromValue('password:desc')).toEqual({});
});
