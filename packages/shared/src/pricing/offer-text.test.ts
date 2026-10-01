import { describe, expect, it } from 'vitest';
import ar from '../../i18n/ar.json' with { type: 'json' };
import { formatAmount, offerText } from './offer-text.js';
import { quote, type QuoteOptions } from './quote.js';

const base = {
  duration: 45,
  country: 'SA',
  students: 1,
  discount: 0,
} satisfies Partial<QuoteOptions>;

describe('offerText (docs/08 §3, site WhatsApp copy)', () => {
  it('package, students, total and the trial note, one per line', () => {
    const text = offerText(quote({ ...base, tier: 'starter', students: 2 }), ar.pricing);
    expect(text.split('\n')).toEqual([
      'السلام عليكم، الباقة المقترحة لك:',
      'الباقة الأساسية (8 حلقات - 45 دقيقة للحلقة)',
      'عدد الطلاب: 2',
      'الإجمالي: 240 ر.س',
      'جميع الباقات تبدأ بجلسة تجريبية مجانية بالكامل — جرّب أولاً ثم قرّر.',
    ]);
  });

  it('adds the discount and the after-discount total when there is one', () => {
    const q = quote({ ...base, tier: 'standard', country: 'KW', students: 3, discount: 10 });
    const lines = offerText(q, ar.pricing).split('\n');
    expect(lines.slice(3, 6)).toEqual([
      'الإجمالي: 54 د.ك',
      'الخصم: 10%',
      'الإجمالي بعد الخصم: 49 د.ك',
    ]);
  });

  it('custom counts, weekly duration and USD with thousands separators', () => {
    const custom = quote({
      ...base,
      count: 60,
      duration: 60,
      country: 'EG',
      usdRate: 1,
      students: 2,
    });
    const lines = offerText(custom, ar.pricing).split('\n');
    expect(lines[1]).toBe('باقة مخصّصة (60 حلقة - 60 دقيقة للحلقة)');
    expect(lines[3]).toBe('الإجمالي: 2,122 $');
    const weekly = offerText(quote({ ...base, tier: 'weekly' }), ar.pricing).split('\n');
    expect(weekly[1]).toBe('باقة الحلقة الأسبوعية (4 حلقات - 90 دقيقة للحلقة)');
  });

  it('formats amounts with Western digits and commas', () => {
    expect([5, 1061, 1234567].map(formatAmount)).toEqual(['5', '1,061', '1,234,567']);
  });
});
