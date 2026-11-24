import type { CourseCardPackage } from '@ab/shared';
import { counted, type PluralForm } from '@ab/core';
import { formatAmount } from '@ab/money';
import { count, fill, type CountWords } from './course-card-text.js';

// The headline and the package line of «الدورة والباقة» (owner 2026-11-17, boards CourseXActions
// and CourseXWebPanel): «بقيت 3 حلقات», «12 حلقة · 9 من 12 حلقة · دُفع 360 من 360 ر.س» and
// «يُتوقع أن تنتهي يوم …». Words and formats are injected (each app's own). Pure.

export interface PackageWords {
  /** «بقيت 3 حلقات» (zero: «لم تبقَ حلقات في الباقة»). */
  left: CountWords;
  /** «12 حلقة». */
  lessons: Readonly<Record<PluralForm, string>>;
  /** «{used} من {total} حلقة». */
  usedOf: string;
  /** «دُفع {paid} من {price}». */
  paidOf: string;
  /** «يُتوقع أن تنتهي يوم {date}». */
  projectedEnd: string;
}

/** The app's `t` (both apps read the same ar.json / en.json), as far as the card needs it. */
export interface PackageCatalog {
  courseCard: { left: CountWords };
  today: { count: Readonly<Record<PluralForm, string>> };
  subscriptions: { usedOf: string; projectedEnd: string };
  payments: { paidOf: string };
}

/** The card's package words from the app's `t`. */
export const packageWordsOf = (t: PackageCatalog): PackageWords => ({
  left: t.courseCard.left,
  lessons: t.today.count,
  usedOf: t.subscriptions.usedOf,
  paidOf: t.payments.paidOf,
  projectedEnd: t.subscriptions.projectedEnd,
});

interface PackageFormat {
  /** «360 ر.س». */
  money: (amount: number, currency: string) => string;
  /** The day of an instant in the viewer's zone. */
  day: (instant: string) => string;
}

export interface PackageLines {
  left: string;
  line: string;
  /** null when the end is not known. */
  end: string | null;
}

/** The card's «بقيت N حلقات», its package line and its projected end. */
export function packageCardLines(input: {
  pkg: CourseCardPackage;
  words: PackageWords;
  format: PackageFormat;
}): PackageLines {
  const { pkg, words, format } = input;
  const used = fill(fill(words.usedOf, 'used', String(pkg.used)), 'total', String(pkg.lessonsTotal));
  const price = format.money(pkg.owed, pkg.currency);
  const paid = fill(fill(words.paidOf, 'paid', formatAmount(pkg.paid)), 'price', price);
  const at = pkg.projectedEndAt;
  return {
    left: count(words.left, pkg.left),
    line: [counted(words.lessons, pkg.lessonsTotal), used, paid].join(' · '),
    end: at ? fill(words.projectedEnd, 'date', format.day(at)) : null,
  };
}
