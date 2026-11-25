import type { CourseCardPackage } from '@ab/shared';
import { counted, type PluralForm } from '@ab/core';
import { formatAmount } from '@ab/money';
import { count, fill, type CountWords } from './course-card-text';

// Pure; words and formats are injected by each app.

export interface PackageWords {
  left: CountWords;
  lessons: Readonly<Record<PluralForm, string>>;
  usedOf: string;
  paidOf: string;
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
