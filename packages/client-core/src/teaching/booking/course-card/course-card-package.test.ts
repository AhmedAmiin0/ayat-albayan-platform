import { describe, expect, it } from 'vitest';
import { packageCardLines, packageWordsOf, type PackageWords } from './course-card-package.js';

const plural = (one: string, n: string) => ({ one, two: n, few: n, other: n });
const words: PackageWords = {
  left: { zero: 'انتهت', ...plural('بقيت حلقة', 'بقيت {n} حلقات') },
  lessons: plural('حلقة', '{n} حلقة'),
  usedOf: '{used} من {total} حلقة',
  paidOf: 'دُفع {paid} من {price}',
  projectedEnd: 'تنتهي يوم {date}',
};
const pkg = {
  ...{ status: 'active' as const, lessonsTotal: 12, used: 9, left: 3, paid: 360, owed: 360 },
  ...{ currency: 'SAR', projectedEndAt: '2026-11-24T15:30:00Z' as string | null },
};
const format = { money: (n: number, c: string) => `${n} ${c}`, day: (i: string) => i.slice(0, 10) };

describe('packageCardLines', () => {
  it('«بقيت 3 حلقات», «12 حلقة · 9 من 12 حلقة · دُفع 360 من 360 SAR» and the end', () => {
    expect(packageCardLines({ pkg, words, format })).toEqual({
      left: 'بقيت 3 حلقات',
      line: '12 حلقة · 9 من 12 حلقة · دُفع 360 من 360 SAR',
      end: 'تنتهي يوم 2026-11-24',
    });
  });

  it('nothing left says the zero form; an unknown end is null', () => {
    const done = { ...pkg, left: 0, projectedEndAt: null };
    const lines = packageCardLines({ pkg: done, words, format });
    expect(lines.left).toBe('انتهت');
    expect(lines.end).toBeNull();
  });

  it('the words come from the app\'s catalog', () => {
    const t = {
      courseCard: { left: words.left },
      today: { count: words.lessons },
      subscriptions: { usedOf: words.usedOf, projectedEnd: words.projectedEnd },
      payments: { paidOf: words.paidOf },
    };
    expect(packageWordsOf(t)).toEqual(words);
  });
});
