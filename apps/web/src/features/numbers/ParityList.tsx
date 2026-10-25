import { SECRET_PARITY_FIELDS, type ParityCell, type ParityView } from '@ab/shared';
import { Ltr } from '@/components/ui/display/ltr';
import { NuqtaGlyph } from '@/components/ui/display/nuqta-glyph';
import { t } from '@/lib/i18n/i18n';

const p = t.numbers.parity;

/** One side's value: a secret is only «محفوظ» (never its value), nothing is «—». */
function Value({ cell, side }: { cell: ParityCell; side: 'legacy' | 'module' }) {
  const v = cell[side];
  if (v === null) return <span>—</span>;
  if (SECRET_PARITY_FIELDS.includes(cell.field)) return <span>{p.secretSet}</span>;
  return <Ltr className="whitespace-normal break-all font-mono">{v}</Ltr>;
}

/**
 * «مطابقة الإعداد» (docs/23 §2e step 4): «مطابق» when nothing differs; else, role by role, each
 * differing field with its state and the legacy vs module values.
 */
export function ParityList({ parity }: { parity: ParityView }) {
  const roles = parity.roles
    .map((r) => ({ ...r, cells: r.fields.filter((f) => f.state !== 'same') }))
    .filter((r) => r.cells.length > 0);
  return (
    <div role="region" aria-labelledby="numbers-parity-title" className="grid gap-2">
      <h3 id="numbers-parity-title" className="text-sm font-bold">{p.title}</h3>
      <p className="max-w-[70ch] text-xs text-ink-3">{p.hint}</p>
      {parity.differences.length === 0 ? (
        <p className="flex items-center gap-1.5 text-sm text-ok">
          <NuqtaGlyph shape="fill" />
          <span>{p.empty}</span>
        </p>
      ) : (
        <>
          <p className="text-sm font-semibold text-danger">{p.count.replace('{{count}}', String(parity.differences.length))}</p>
          {roles.map((r) => (
            <section key={r.role} aria-label={t.numbers.purpose[r.role]} className="grid gap-1 text-xs">
              <p className="font-semibold text-ink">
                {t.numbers.purpose[r.role]} · {r.number_label ? <bdi>{r.number_label}</bdi> : p.noNumber}
              </p>
              <ul className="grid gap-1">
                {r.cells.map((cell) => (
                  <li key={cell.field} data-field={cell.field} className="flex flex-wrap items-baseline gap-x-2 text-ink-2">
                    <span className="font-semibold text-ink">{t.numbers.fields[cell.field]}</span>
                    <span className="text-danger">({p.state[cell.state]})</span>
                    <span>{p.legacy}: <Value cell={cell} side="legacy" /></span>
                    <span>{p.module}: <Value cell={cell} side="module" /></span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
