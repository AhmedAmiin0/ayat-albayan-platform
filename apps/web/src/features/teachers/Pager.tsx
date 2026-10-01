import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';

type Props = { page: number; total: number; pageSize: number; onPage: (page: number) => void };

/** Server-side pagination controls (R-NFR-08). */
export function Pager({ page, total, pageSize, onPage }: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const label = t.teachers.pageInfo.replace('{page}', String(page)).replace('{pages}', String(pages));
  return (
    <nav aria-label={label} className="mt-4 flex items-center gap-3 text-sm">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        {t.teachers.prevPage}
      </Button>
      <span>{label}</span>
      <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        {t.teachers.nextPage}
      </Button>
    </nav>
  );
}
