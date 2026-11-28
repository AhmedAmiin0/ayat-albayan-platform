import type { PackageId, PriceList, Quote } from '@ab/money';

const TIER_IDS = ['starter', 'standard', 'premium', 'bulk', 'monthly'] as const;
const DURATIONS = [30, 45, 60] as const;
const MADE_UP = {
  starter: { lessons: 8, step: 0 },
  standard: { lessons: 12, step: 1 },
  premium: { lessons: 16, step: 2 },
  bulk: { lessons: 28, step: 3 },
  monthly: { lessons: 20, step: 4 },
  weekly: { lessons: 4, step: 5 },
};

/** Made-up amounts: a total of 1000 + 100 per tier step + the minutes, 7 less after a discount. */
function aQuote(id: PackageId, duration: number, discount: number): Quote {
  const total = 1000 + 100 * MADE_UP[id].step + duration;
  return {
    package: id,
    lessons: MADE_UP[id].lessons,
    duration,
    country: 'QA',
    currency: 'QAR',
    price: total,
    students: 1,
    total,
    discount,
    afterDiscount: discount > 0 ? total - 7 : total,
    perLesson: 1,
    insteadOf: null,
    savingsPct: null,
    popular: id === 'standard',
    featured: id === 'bulk',
  };
}

/** A price list with made-up prices: aPriceList().discounted(10).without('monthly').build(). */
export function aPriceList() {
  let discount = 0;
  let students = 1;
  let dropped: PackageId[] = [];
  const builder = {
    discounted(pct: number) {
      discount = pct;
      return builder;
    },
    forStudents(n: number) {
      students = n;
      return builder;
    },
    without(...ids: PackageId[]) {
      dropped = ids;
      return builder;
    },
    build(): PriceList {
      const ids = TIER_IDS.filter((id) => !dropped.includes(id));
      return {
        country: 'QA',
        currency: 'QAR',
        students,
        discount,
        groups: DURATIONS.map((d) => ({
          duration: d,
          packages: ids.map((id) => aQuote(id, d, discount)),
        })),
        weekly: aQuote('weekly', 90, discount),
      };
    },
  };
  return builder;
}
