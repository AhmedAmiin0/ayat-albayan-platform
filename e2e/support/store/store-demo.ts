import type { DemoLesson, DemoReport } from './store.types';

// The listing's demo family: invented Arabic first names, report text a teacher would write.

const DAY = 86_400_000;

const LATEST: DemoReport = {
  recited: 'سورة الملك من الآية 1 إلى الآية 15',
  newMemorization: 'سورة القلم من الآية 1 إلى الآية 12',
  revision: 'سورة الملك كاملة مع مراجعة أحكام النون الساكنة',
  notes: 'أداء متميز وتحسن واضح في مخارج الحروف، مع حاجة إلى مزيد من الانتباه لأحكام المدود.',
  homework: 'ترديد الآيات الجديدة ثلاث مرات يوميًا مع الاستماع إلى التلاوة',
  nextPlan: 'إكمال سورة القلم حتى الآية 25',
  overall: 'excellent',
};

const EARLIER: DemoReport = {
  recited: 'سورة الملك من الآية 1 إلى الآية 8',
  newMemorization: 'سورة الملك من الآية 9 إلى الآية 15',
  revision: 'جزء عمّ: من سورة النبأ إلى سورة عبس',
  notes: 'حفظ جيد ومشاركة فاعلة، ويُنصح بالتركيز على أحكام الإدغام.',
  homework: 'مراجعة سورة النبأ وتسميعها لولي الأمر',
  nextPlan: 'تسميع سورة الملك من الآية 1 إلى الآية 15',
  overall: 'very_good',
};

const at = (from: Date, days: number): Date => new Date(from.getTime() + days * DAY);

export const DEMO = {
  guardian: 'عبد الرحمن',
  first: 'مريم',
  second: 'يوسف',
  /** Two past lessons with reports, the next one, then two more ahead. */
  firstLessons: (next: Date): DemoLesson[] => [
    { startsAt: at(next, -6), done: true, report: EARLIER },
    { startsAt: at(next, -2), done: true, report: LATEST },
    { startsAt: next, done: false },
    { startsAt: at(next, 2), done: false },
    { startsAt: at(next, 4), done: false },
  ],
  secondLessons: (next: Date): DemoLesson[] => [
    { startsAt: at(next, -3), done: true },
    { startsAt: at(next, 1), done: false },
  ],
};
