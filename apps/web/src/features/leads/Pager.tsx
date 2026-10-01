import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';

export interface PagerProps {
  page: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
}

/** Previous / next for server-side paged lists (R-NFR-08). Hidden when one page fits. */
export function Pager({ page, total, pageSize, onPage }: PagerProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1 && page <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 text-sm">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        {t.leads.prevPage}
      </Button>
      <span>{t.leads.pageOf.replace('{page}', String(page)).replace('{pages}', String(pages))}</span>
      <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        {t.leads.nextPage}
      </Button>
    </div>
  );
}
