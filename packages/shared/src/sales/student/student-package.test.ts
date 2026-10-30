import { describe, expect, it } from 'vitest';
import { packageSummaryParts, type PackageWords, type SalesPackageSummary } from './student-package.js';

const words: PackageWords = {
  size: (size) => (size ? `باقة ${size}` : '—'),
  status: (status) => `[${status}]`,
  day: (iso) => iso.slice(0, 10),
  date: (ymd) => `<${ymd}>`,
  used: 'استُخدمت {used} من {total}',
  remaining: 'المتبقي: {n}',
  starts: 'البدء: {date}',
  ended: 'الانتهاء: {date}',
  projectedEnd: 'النهاية المتوقعة: {date}',
};

const summary = (over: Partial<SalesPackageSummary> = {}): SalesPackageSummary => ({
  id: 'sub1', package: '12', status: 'active', starts_on: '2026-10-01', renews_on: null,
  ended_at: null, projected_end_at: '2026-11-20T08:00:00.000Z', created_at: '2026-09-30T10:00:00Z',
  lessons_total: 12, lessons_used: 5, lessons_remaining: 7, ...over,
});

describe('packageSummaryParts', () => {
  it('size · status, used of total, left, start and the expected end', () => {
    expect(packageSummaryParts(summary(), words)).toEqual([
      'باقة 12 · [active]',
      'استُخدمت 5 من 12',
      'المتبقي: 7',
      'البدء: <2026-10-01>',
      'النهاية المتوقعة: 2026-11-20',
    ]);
  });

  it('an ended package says the day it ended, not an expected one', () => {
    const ended = summary({ status: 'expired', ended_at: '2026-10-25T08:00:00Z', lessons_remaining: 0 });
    expect(packageSummaryParts(ended, words).at(-1)).toBe('الانتهاء: 2026-10-25');
  });

  it('no end known: no end part; a package without a size reads «—»', () => {
    const parts = packageSummaryParts(summary({ projected_end_at: null, package: null }), words);
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe('— · [active]');
  });
});
