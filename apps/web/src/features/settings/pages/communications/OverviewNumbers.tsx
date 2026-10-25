import { formatPhone, type NumberView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Ltr } from '@/components/ui/display/ltr';
import { NuqtaGlyph } from '@/components/ui/display/nuqta-glyph';
import { Skeleton } from '@/components/ui/display/skeleton';
import { numbersQuery } from '@/features/numbers/numbers-api';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { CELL, LINK, TH } from './overview-table';

const h = t.communicationsHub;
const n = t.numbers;

/** The last check as a glyph and a word (the card on «الأرقام» says when and the quality). */
function Health({ view }: { view: NumberView }) {
  if (!view.health || !view.checked_at) {
    return (
      <span className="inline-flex items-center gap-1.5 text-ink-3">
        <NuqtaGlyph shape="hollow" />
        {n.chips.notChecked}
      </span>
    );
  }
  const ok = view.health.ok;
  return (
    <span className={cn('inline-flex items-center gap-1.5 font-semibold', ok ? 'text-ok' : 'text-danger')}>
      <NuqtaGlyph shape={ok ? 'fill' : 'struck'} />
      {ok ? n.health.ok : n.health.failed}
    </span>
  );
}

const COLS = [n.chips.phone, n.fields.purpose, n.fields.provider, h.colHealth] as const;

/**
 * «الأرقام وحالتها» on «نظرة عامة» (docs/23 §2d): each number in one row — name, phone (LTR), role,
 * provider, last check — read-only from GET /admin/numbers (the same query «الأرقام» edits).
 */
export function OverviewNumbers() {
  const numbers = useQuery(numbersQuery);
  return (
    <section aria-labelledby="overview-numbers" className="grid min-w-0 gap-2">
      <div className="flex flex-wrap items-center justify-between gap-x-3">
        <h2 id="overview-numbers" className="text-h4 font-bold">
          {h.numbersTitle}
        </h2>
        <Link to="/admin/settings/communications" search={{ tab: 'numbers' }} className={LINK}>
          {h.numbersOpen}
        </Link>
      </div>
      {numbers.isPending && (
        <div aria-busy="true" className="grid gap-2 py-2">
          <span className="sr-only">{t.common.loading}</span>
          <Skeleton className="w-2/3" />
          <Skeleton className="w-1/2" />
        </div>
      )}
      <div aria-live="polite">
        {numbers.isError && <p className="text-sm text-ink-2">{n.loadError}</p>}
        {numbers.data?.length === 0 && <p className="text-sm text-ink-2">{h.numbersEmpty}</p>}
      </div>
      {numbers.data && numbers.data.length > 0 && (
        <div className="overflow-x-auto">
          <table aria-labelledby="overview-numbers" className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th scope="col" className={TH}>
                  {n.fields.label}
                </th>
                {COLS.map((label) => (
                  <th key={label} scope="col" className={TH}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {numbers.data.map((view) => (
                <tr key={view.id} data-number={view.id}>
                  <th scope="row" className={cn(CELL, 'font-semibold')}>
                    <bdi>{view.label}</bdi>
                  </th>
                  <td className={CELL}>{view.display_phone_e164 ? <Ltr>{formatPhone(view.display_phone_e164)}</Ltr> : '—'}</td>
                  <td className={CELL}>{n.purpose[view.purpose]}</td>
                  <td className={CELL}>{n.provider[view.provider]}</td>
                  <td className={cn(CELL, 'text-xs')}>
                    <Health view={view} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
