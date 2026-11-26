import { describe, expect, it } from 'vitest';
import { durationWords, packageLine, packageWords } from './offer-text';
import { quote } from './quote';

// Plain words: the offer's real Arabic text is pinned in @ab/shared, where ar.json lives.
const pack = (name: string, lessons: number) => ({ name, sessions: `${lessons} lessons` });
const labels = {
  packages: {
    starter: pack('Starter', 8),
    standard: pack('Standard', 12),
    premium: pack('Premium', 16),
    bulk: pack('Bulk', 28),
    weekly: pack('Weekly', 4),
    monthly: pack('Monthly', 20),
    custom: { name: 'Custom' },
  },
  customSessions: { one: 'one lesson', two: 'two lessons', few: '{n} few', other: '{n} many' },
  durations: { '45': '45 min', '90': '90 min' },
  perCircle: 'each',
};
const base = { duration: 45, country: 'SA', students: 1, discount: 0 } as const;

describe('packageWords', () => {
  it('a package says its own name and lesson count', () => {
    expect(packageWords(quote({ ...base, tier: 'bulk' }), labels)).toEqual({
      name: 'Bulk',
      sessions: '28 lessons',
    });
  });

  it.each([
    [1, 'one lesson'],
    [2, 'two lessons'],
    [7, '7 few'],
    [20, '20 many'],
  ])('a custom count of %i is counted by the plural rules', (count, sessions) => {
    expect(packageWords(quote({ ...base, count }), labels)).toEqual({ name: 'Custom', sessions });
  });
});

describe('durationWords', () => {
  it('uses the label, and falls back to the minutes when there is none', () => {
    expect(durationWords(45, labels)).toBe('45 min');
    expect(durationWords(30, labels)).toBe('30');
  });
});

describe('packageLine', () => {
  it('name, lessons and the minutes of one lesson', () => {
    expect(packageLine(quote({ ...base, tier: 'standard' }), labels)).toBe(
      'Standard (12 lessons - 45 min each)',
    );
  });

  it('weekly says its fixed 90 minutes whatever duration was asked', () => {
    expect(packageLine(quote({ ...base, tier: 'weekly', duration: 30 }), labels)).toBe(
      'Weekly (4 lessons - 90 min each)',
    );
  });

  it('a custom count', () => {
    expect(packageLine(quote({ ...base, count: 3, duration: 60 }), labels)).toBe(
      'Custom (3 few - 60 each)',
    );
  });
});
