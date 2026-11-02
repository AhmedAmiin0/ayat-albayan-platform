import { t } from '@/lib/i18n/i18n';
import type { Teacher } from '@/features/people/teachers/api';
import { RATE_FIELDS } from '@/features/people/teachers/form/teacher-form';

/** «سعر الحلقة (جنيه)»: one row per duration that has a rate, Western tabular digits. R-TCH-01. */
export function RatesTable({ teacher }: { teacher: Teacher }) {
  const rates = RATE_FIELDS.flatMap(({ key, label }) => {
    const value = teacher[key];
    return value === null || value === undefined ? [] : [{ key, label, value }];
  });
  return (
    <section>
      <h2 className="mb-2 font-display text-h4 font-bold">{t.teachers.rates}</h2>
      {rates.length === 0 ? (
        <p className="border-b border-rule py-3 text-sm text-ink-3">{t.common.empty}</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <tbody>
            {rates.map((rate) => (
              <tr key={rate.key} className="border-b border-rule">
                <th scope="row" className="px-1 py-[9px] text-start font-normal">
                  {rate.label}
                </th>
                <td className="px-1 py-[9px] text-end font-semibold tabular-nums">{rate.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
