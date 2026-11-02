import { describe, expect, it } from 'vitest';
import { normalizeArabic } from './arabic.js';

// R-STU-03: normalised Arabic (strip hamza / taa marbuta / ya variants).
describe('normalizeArabic (R-STU-03)', () => {
  it.each([
    ['سهيلة', 'سهيله'],
    ['أبرار', 'ابرار'],
    ['إيمان', 'ايمان'],
    ['آمنة', 'امنه'],
    ['ٱلاء', 'الاء'],
    ['مؤمن', 'مومن'],
    ['هانئ', 'هاني'],
    ['جودى', 'جودي'],
    ['مُحَمَّد', 'محمد'],
    ['عبـــدالله', 'عبدالله'],
    ['  فاطمة    محمد  ', 'فاطمه محمد'],
    ['الأستاذة : هند', 'الاستاذه : هند'],
    ['Abrar', 'abrar'],
    ['', ''],
  ])('%j → %j', (input, out) => {
    expect(normalizeArabic(input)).toBe(out);
  });

  it('is idempotent', () => {
    const once = normalizeArabic('أُمّ جُودَى وسُهَيْلَة');
    expect(normalizeArabic(once)).toBe(once);
  });
});
