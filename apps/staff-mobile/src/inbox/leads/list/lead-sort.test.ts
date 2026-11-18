import { leadSortFromValue, leadSortValue } from '@ab/client-core';
import { t } from '@ab/mobile-kit';
import { leadSortChoices } from './lead-sort';

test('every choice round-trips through its select value', () => {
  for (const { value } of leadSortChoices()) {
    expect(leadSortValue(leadSortFromValue(value))).toBe(value);
  }
});

test('«الأحدث إضافةً» is a choice', () => {
  expect(leadSortChoices().map((c) => c.label)).toContain(t.leads.sort.newest);
});
