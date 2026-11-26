import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';
import { Button } from '@ab/web-kit/components/ui/form/Button';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { pageCount, pageList } from './page-list';
import { Rosette } from '@ab/web-kit/components/ui/display/rosette';

export interface PagerProps {
  /** 1-based current page. */
  page: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
}

/** R-NFR-08, docs/07 §6; nothing for an empty list, steps only with more than one page. */
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
