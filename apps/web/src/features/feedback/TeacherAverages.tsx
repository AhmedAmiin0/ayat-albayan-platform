import { t } from '@/lib/i18n';

export interface AverageItem {
  key: string;
  /** Teacher name; omitted on the teacher's own page (it is always me). */
  name?: string | undefined;
  avg: number;
  n: number;
  yesPct: number;
}

/** 4.6 with one decimal, Western digits. */
export const avgText = (avg: number): string => avg.toFixed(1);

/** «نسبة الترشيح»: a whole percent. */
export const pctText = (pct: number): string => `${Math.round(pct)}%`;

/** The average rating, the number of answers and «نسبة الترشيح» per teacher (admin) or mine (teacher). */
export function TeacherAverages({ items }: { items: readonly AverageItem[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-label={t.feedback.averages} className="mb-5">
      <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((i) => (
          <li key={i.key} className="grid gap-1 border-b border-rule pb-3">
            {i.name && <p className="font-semibold">{i.name}</p>}
            <p className="flex items-baseline gap-2">
              <span className="font-display text-h2 font-bold tabular-nums">{avgText(i.avg)}</span>
              <span className="text-xs text-ink-3">{t.feedback.outOf.replace('{n}', '5')}</span>
            </p>
            <p className="text-xs text-ink-2">
              {t.feedback.total.replace('{n}', String(i.n))} · {t.feedback.yesPct} {pctText(i.yesPct)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
