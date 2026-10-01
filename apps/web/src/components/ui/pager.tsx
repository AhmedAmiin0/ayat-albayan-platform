import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Icon } from './icon';
import { pageCount, pageList } from './page-list';
import { Rosette } from './rosette';

export interface PagerProps {
  /** 1-based current page. */
  page: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
}

/**
 * Server-side pagination (R-NFR-08, docs/07 §6): «عرض 8 من 64», page numbers with the current
 * one in the rosette, السابق / التالي. Same props as the Phase 1 feature Pagers. Nothing renders
 * for an empty list; the numbers and steps only when there is more than one page.
 */
export function Pager({ page, total, pageSize, onPage }: PagerProps) {
  if (total === 0) return null;
  const pages = pageCount(total, pageSize);
  const shown = Math.max(0, Math.min(pageSize, total - (page - 1) * pageSize));
  const count = t.common.showing.replace('{shown}', String(shown)).replace('{total}', String(total));

  return (
    <nav
      aria-label={t.common.pages}
      className="flex flex-wrap items-center justify-center gap-3 pt-3.5 text-xs text-ink-3 sm:justify-between"
    >
      <span className="w-full text-center tabular-nums sm:w-auto">{count}</span>
      {pages > 1 && (
        <>
          <ol className="flex items-center gap-0.5">
            {pageList(page, pages).map((n, i) =>
              n === 'gap' ? (
                <li key={`gap-${i}`} aria-hidden="true" className="grid min-w-9 place-items-center">
                  …
                </li>
              ) : (
                <li key={n}>
                  <button
                    type="button"
                    aria-current={n === page ? 'page' : undefined}
                    onClick={() => onPage(n)}
                    className={cn(
                      'grid h-11 min-w-11 place-items-center rounded-md text-ink-2 tabular-nums sm:h-9 sm:min-w-9',
                      n === page ? 'text-ink' : 'hover:bg-sunk',
                    )}
                  >
                    {n === page ? <Rosette value={n} /> : n}
                  </button>
                </li>
              ),
            )}
          </ol>
          <div className="flex gap-1.5">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
              <Icon name="chevron-right" />
              {t.common.prevPage}
            </Button>
            <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
              {t.common.nextPage}
              <Icon name="chevron-left" />
            </Button>
          </div>
        </>
      )}
    </nav>
  );
}
