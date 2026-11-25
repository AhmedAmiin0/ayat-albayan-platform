import { fillSlots } from '@ab/client-core';
import { Button, t } from '@ab/web-kit';

const L = t.shortLinks.list;

interface ListPagerProps {
  /** 1 when the URL has none. */
  page: number | undefined;
  pageSize: number;
  /** Unknown while the first page loads. */
  total: number | undefined;
  onPage: (page: number) => void;
}

/** Nothing for an empty list. */
export function ListPager({ page = 1, pageSize, total = 0, onPage }: ListPagerProps) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav aria-label={t.common.pages} className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm text-ink-2 tabular-nums">
        {fillSlots(L.pageOf, { from, to, total })}
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          {L.previous}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={to >= total}
          onClick={() => onPage(page + 1)}
        >
          {L.next}
        </Button>
      </div>
    </nav>
  );
}
