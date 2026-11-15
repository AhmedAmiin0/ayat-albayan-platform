import { Link } from '@tanstack/react-router';
import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/data-table/DataTable';
import { buttonVariants } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import type { AssistantRow } from './api';
import { commissionText, dayText, salaryText } from './terms/terms-summary';

const col = createColumnHelper<DataTableFeatures, AssistantRow>();
const since = (day: string | undefined) => (day ? t.assistants.startsOn.replace('{date}', dayText(day)) : null);

/** Name, salary, commission and a «تعديل الشروط» link to the detail page. */
export function assistantColumns() {
  return col.columns([
    col.accessor('name', {
      header: () => t.assistants.name,
      cell: (c) => (
        <Link to="/admin/assistants/$assistantId" params={{ assistantId: c.row.original.id }} className="font-semibold text-ink hover:underline">
          {c.getValue()}
        </Link>
      ),
      meta: { className: 'max-sm:order-1 max-sm:flex-[1_1_60%]', filter: { kind: 'text' } },
    }),
    col.accessor((a) => salaryText(a.terms.salary), {
      id: 'salary',
      header: () => t.assistants.salary,
      cell: (c) => (
        <div className="grid">
          <span className="tabular-nums">{c.getValue()}</span>
          <span className="text-2xs text-ink-3">{since(c.row.original.terms.salary?.starts_on)}</span>
        </div>
      ),
      meta: { className: 'max-sm:order-2' },
    }),
    col.accessor((a) => commissionText(a.terms.commission), {
      id: 'commission',
      header: () => t.assistants.commission,
      cell: (c) => (
        <div className="grid">
          <span>{c.getValue()}</span>
          <span className="text-2xs text-ink-3">{since(c.row.original.terms.commission?.starts_on)}</span>
        </div>
      ),
      meta: { className: 'max-sm:order-3' },
    }),
    col.display({
      id: 'actions',
      header: () => <span className="sr-only">{t.common.actions}</span>,
      cell: (c) => (
        <Link to="/admin/assistants/$assistantId" params={{ assistantId: c.row.original.id }} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
          {t.assistants.editTerms}
        </Link>
      ),
      meta: { className: 'w-px max-sm:order-4' },
    }),
  ]);
}
