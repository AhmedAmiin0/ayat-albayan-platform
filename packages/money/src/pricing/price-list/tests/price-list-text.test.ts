import { describe, expect, it } from 'vitest';
import { priceList } from '../price-list';
import { priceListText } from '../price-list-text';
import type { PriceListLabels } from '../price-list.types';

// Plain words, so the test reads the shape; the real Arabic text is pinned in @ab/shared.
const pack = (name: string, lessons: number) => ({ name, sessions: `${lessons} lessons` });
const labels: PriceListLabels = {
  listIntro: 'Our prices:',
  listDiscount: 'After {pct}% off',
  listDuration: 'Lessons of {duration}:',
  packages: {
    starter: pack('Starter', 8),
    standard: pack('Standard', 12),
    premium: pack('Premium', 16),
    bulk: pack('Bulk', 28),
    weekly: pack('Weekly', 4),
    monthly: pack('Monthly', 20),
    custom: { name: 'Custom' },
  },
  customSessions: { one: '1 lesson', two: '2 lessons', few: '{n} lessons', other: '{n} lessons' },
  durations: { '30': '30 min', '45': '45 min', '60': '60 min', '90': '90 min' },
  currencies: { SAR: 'SR', AED: 'AED', QAR: 'QR', KWD: 'KD', OMR: 'OR', USD: '$' },
  perCircle: 'each',
  studentsLabel: 'Students',
  trialNote: 'The first lesson is free.',
};

const base = { country: 'SA', students: 1, discount: 0 };
const blocks = (text: string): string[][] => text.split('\n\n').map((b) => b.split('\n'));

describe('priceListText — one message with every price', () => {
  it('intro, a block per duration, weekly, then the trial note, a blank line between', () => {
    expect(priceListText(priceList(base), labels)).toBe(
      [
        'Our prices:',
        '',
        'Lessons of 30 min:',
        '• Starter (8 lessons): 90 SR',
        '• Standard (12 lessons): 135 SR',
        '• Premium (16 lessons): 175 SR',
        '• Bulk (28 lessons): 275 SR',
        '• Monthly (20 lessons): 210 SR',
        '',
        'Lessons of 45 min:',
        '• Starter (8 lessons): 120 SR',
        '• Standard (12 lessons): 180 SR',
        '• Premium (16 lessons): 240 SR',
        '• Bulk (28 lessons): 385 SR',
        '• Monthly (20 lessons): 285 SR',
        '',
        'Lessons of 60 min:',
        '• Starter (8 lessons): 160 SR',
        '• Standard (12 lessons): 235 SR',
        '• Premium (16 lessons): 315 SR',
        '• Bulk (28 lessons): 495 SR',
        '• Monthly (20 lessons): 375 SR',
        '',
        'Weekly (4 lessons - 90 min each): 145 SR',
        '',
        'The first lesson is free.',
      ].join('\n'),
    );
  });

  it('says the discount only when there is one, as the percent was chosen', () => {
    const head = (discount: number) =>
      blocks(priceListText(priceList({ ...base, discount }), labels))[0];
    expect(head(0)).toEqual(['Our prices:']);
    expect(head(10)).toEqual(['Our prices:', 'After 10% off']);
    expect(head(12.5)).toEqual(['Our prices:', 'After 12.5% off']);
  });

  it('says the students only when there is more than one', () => {
    const head = (students: number) =>
      blocks(priceListText(priceList({ ...base, students, discount: 10 }), labels))[0];
    expect(head(1)).toEqual(['Our prices:', 'After 10% off']);
    expect(head(2)).toEqual(['Our prices:', 'After 10% off', 'Students: 2']);
    expect(blocks(priceListText(priceList({ ...base, students: 3 }), labels))[0]).toEqual([
      'Our prices:',
      'Students: 3',
    ]);
  });

  it('prints the price after the discount, in the list currency', () => {
    const list = priceList({ country: 'KW', students: 3, discount: 10, rounding: 'down' });
    const text = blocks(priceListText(list, labels));
    expect(text[2]?.[2]).toBe('• Standard (12 lessons): 48 KD');
    expect(text[4]).toEqual(['Weekly (4 lessons - 90 min each): 40 KD']);
  });

  it('USD with a thousands separator', () => {
    const list = priceList({ country: 'EG', students: 6, discount: 0, usdRate: 1 });
    const text = blocks(priceListText(list, labels));
    expect(text[3]?.[4]).toBe('• Bulk (28 lessons): 2,970 $');
  });

  it('a duration without a label falls back to its minutes', () => {
    const bare = { ...labels, durations: {} };
    const text = blocks(priceListText(priceList(base), bare));
    expect(text[1]?.[0]).toBe('Lessons of 30:');
    expect(text[4]).toEqual(['Weekly (4 lessons - 90 each): 145 SR']);
  });
});
