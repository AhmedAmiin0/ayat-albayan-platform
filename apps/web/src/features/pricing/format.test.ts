import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import type { FxRate } from './api';
import { quote } from '@ab/shared';
import { durationLabel, fxLine, quoteSummary, sessionsOf, waLink } from './format';

const FX: FxRate = {
  quote: 'USD',
  rate: 0.266667,
  date: '2026-10-02T00:00:01+00:00',
  provider: 'open.er-api.com',
  fallback: false,
  ageHours: null,
};

describe('pricing display text', () => {
  it('names the lessons of a package, or counts a custom number', () => {
    expect(sessionsOf({ package: 'standard', lessons: 12 })).toBe(
      t.pricing.packages.standard.sessions,
    );
    expect(sessionsOf({ package: 'custom', lessons: 2 })).toBe(t.pricing.customSessions.two);
    expect(sessionsOf({ package: 'custom', lessons: 7 })).toBe('7 حلقات');
  });

  it('labels 30/45/60 and the weekly 90 minutes', () => {
    expect(durationLabel(45)).toBe(t.pricing.durations['45']);
    expect(durationLabel(90)).toBe(t.pricing.durations['90']);
  });

  it('dates a fresh rate in Western digits', () => {
    const line = fxLine(FX);
    expect(line.startsWith(t.pricing.fx.rateDate.replace('{date}', ''))).toBe(true);
    expect(line).toContain('2026');
    expect(line).not.toMatch(/[٠-٩]/);
  });

  it('says when the rate is an older stored one, and when it is the peg', () => {
    expect(fxLine({ ...FX, ageHours: 30 })).toContain(t.pricing.fx.stale.split('{date}')[0]);
    expect(fxLine({ ...FX, provider: 'peg', date: null, fallback: true })).toBe(
      t.pricing.fx.fallback,
    );
  });

  it('sums a quote up for screen readers: price, then the final total when it differs', () => {
    const one = quote({ tier: 'standard', duration: 45, country: 'SA', students: 1, discount: 0 });
    expect(quoteSummary(one)).toBe(`${t.pricing.packages.standard.name} (12 حلقة): 180 ر.س`);
    const three = { ...one, students: 3, total: 540, discount: 10, afterDiscount: 486 };
    expect(quoteSummary(three)).toContain(`${t.pricing.afterDiscount}: 486 ر.س`);
    expect(quoteSummary({ ...three, discount: 0, afterDiscount: 540 })).toContain(
      `${t.pricing.total}: 540 ر.س`,
    );
  });

  it('puts the offer in a wa.me link with its line breaks and symbols encoded', () => {
    expect(waLink('a & b\n10%')).toBe('https://wa.me/?text=a%20%26%20b%0A10%25');
  });
});
