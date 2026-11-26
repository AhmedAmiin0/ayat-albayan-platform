import { describe, expect, it } from 'vitest';
import ar from '../../../i18n/ar.json' with { type: 'json' };
import en from '../../../i18n/en.json' with { type: 'json' };
import { priceList, priceListText, quote } from '@ab/money';

const TRIAL = 'جميع الباقات تبدأ بجلسة تجريبية مجانية بالكامل — جرّب أولاً ثم قرّر.';

describe('priceListText with the real Arabic labels (docs/08 §3b)', () => {
  it('SA, two students, 10 %: the whole message', () => {
    const list = priceList({ country: 'SA', students: 2, discount: 10 });
    expect(priceListText(list, ar.pricing).split('\n')).toEqual([
      'السلام عليكم، هذه أسعار باقاتنا:',
      'الأسعار بعد خصم 10%',
      'عدد الطلاب: 2',
      '',
      'مدة الحلقة 30 دقيقة:',
      '• الباقة الأساسية (8 حلقات): 162 ر.س',
      '• الباقة المتقدمة (12 حلقة): 243 ر.س',
      '• الباقة الشاملة (16 حلقة): 315 ر.س',
      '• باقة الـ28 حلقة (28 حلقة): 495 ر.س',
      '• الاشتراك الشهري المكثّف (20 حلقة في الشهر): 378 ر.س',
      '',
      'مدة الحلقة 45 دقيقة:',
      '• الباقة الأساسية (8 حلقات): 216 ر.س',
      '• الباقة المتقدمة (12 حلقة): 324 ر.س',
      '• الباقة الشاملة (16 حلقة): 432 ر.س',
      '• باقة الـ28 حلقة (28 حلقة): 693 ر.س',
      '• الاشتراك الشهري المكثّف (20 حلقة في الشهر): 513 ر.س',
      '',
      'مدة الحلقة 60 دقيقة:',
      '• الباقة الأساسية (8 حلقات): 288 ر.س',
      '• الباقة المتقدمة (12 حلقة): 423 ر.س',
      '• الباقة الشاملة (16 حلقة): 567 ر.س',
      '• باقة الـ28 حلقة (28 حلقة): 891 ر.س',
      '• الاشتراك الشهري المكثّف (20 حلقة في الشهر): 675 ر.س',
      '',
      'باقة الحلقة الأسبوعية (4 حلقات - 90 دقيقة للحلقة): 261 ر.س',
      '',
      TRIAL,
    ]);
  });

  it('one student and no discount: the greeting stands alone', () => {
    const text = priceListText(priceList({ country: 'QA', students: 1, discount: 0 }), ar.pricing);
    expect(text.split('\n').slice(0, 4)).toEqual([
      'السلام عليكم، هذه أسعار باقاتنا:',
      '',
      'مدة الحلقة 30 دقيقة:',
      '• الباقة الأساسية (8 حلقات): 90 ر.ق',
    ]);
    expect(text.endsWith(`\n\n${TRIAL}`)).toBe(true);
  });

  it('a free-field percent is written as entered, rounded as asked', () => {
    const list = priceList({ country: 'KW', students: 1, discount: 12.5, rounding: 'up' });
    const lines = priceListText(list, ar.pricing).split('\n');
    expect(lines[1]).toBe('الأسعار بعد خصم 12.5%');
    expect(lines[3]).toBe('مدة الحلقة 30 دقيقة:');
    expect(lines[4]).toBe('• الباقة الأساسية (8 حلقات): 8 د.ك');
  });

  it('another country is listed in dollars', () => {
    const list = priceList({ country: 'EG', students: 1, discount: 0, usdRate: 0.25 });
    const lines = priceListText(list, ar.pricing).split('\n');
    expect(lines.slice(9, 11)).toEqual([
      'مدة الحلقة 45 دقيقة:',
      '• الباقة الأساسية (8 حلقات): 30 $',
    ]);
    expect(lines[23]).toBe('باقة الحلقة الأسبوعية (4 حلقات - 90 دقيقة للحلقة): 37 $');
  });

  it('every listed price is the single offer price for the same choice', () => {
    const o = { country: 'OM', students: 3, discount: 15, rounding: 'down' } as const;
    const text = priceListText(priceList(o), ar.pricing);
    const single = quote({ ...o, tier: 'premium', duration: 60 });
    expect(single.afterDiscount).toBe(81);
    expect(text).toContain('مدة الحلقة 60 دقيقة:\n• الباقة الأساسية (8 حلقات): 40 ر.ع');
    expect(text).toContain('• الباقة الشاملة (16 حلقة): 81 ر.ع');
  });

  it('the English labels fill the same slots', () => {
    const list = priceList({ country: 'SA', students: 2, discount: 5 });
    expect(priceListText(list, en.pricing).split('\n').slice(0, 5)).toEqual([
      'Assalamu alaikum, here are our package prices:',
      'Prices after a 5% discount',
      'Number of students: 2',
      '',
      'Lesson duration 30 minutes:',
    ]);
  });
});
