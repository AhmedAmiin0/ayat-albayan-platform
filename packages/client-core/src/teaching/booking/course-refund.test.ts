import ar from '@ab/shared/i18n/ar.json' with { type: 'json' };
import { describe, expect, it } from 'vitest';
import { oweOptions, refundOptions, stopRefundLines, stopSummaryText } from './course-refund.js';

const money = (n: number) => `${n} ر.س`;
const refund = {
  paid: 400,
  perLesson: 50,
  attended: 3,
  ratePercent: 150,
  charged: 225,
  refund: 175,
};
const words = ar.courseActions.stop;

describe('stopRefundLines (MSA)', () => {
  it('paid, attended × price × rate', () => {
    expect(stopRefundLines(words, refund, money)).toEqual([
      'المدفوع: 400 ر.س',
      'الحلقات المحضورة: 3 × 50 ر.س × 150٪ = 225 ر.س',
    ]);
  });
});

describe('the options carry their computed amounts', () => {
  it('refund: unattended (default) and everything paid show the amount; custom does not', () => {
    expect(refundOptions(words, refund, money)).toEqual([
      { value: 'unattended', label: 'الحلقات غير المحضورة فقط: 175 ر.س' },
      { value: 'paid', label: 'المبلغ المدفوع كاملًا: 400 ر.س' },
      { value: 'custom', label: 'مبلغ مخصص' },
    ]);
  });

  it('owe: attended (default), the price, nothing, custom', () => {
    expect(oweOptions(words, { charged: 225, price: 400 }, money).map((o) => o.label)).toEqual([
      'الحلقات المحضورة: 225 ر.س',
      'سعر الباقة كاملًا: 400 ر.س',
      'لا شيء',
      'مبلغ مخصص',
    ]);
  });

  it('the summary line says the refund and what stays owed', () => {
    expect(stopSummaryText(words, { refund: 175, due: 0 }, money)).toBe(
      'الاسترداد: 175 ر.س · المتبقي على الأسرة: 0 ر.س',
    );
  });
});
