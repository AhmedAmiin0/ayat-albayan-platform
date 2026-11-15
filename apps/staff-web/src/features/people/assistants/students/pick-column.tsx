import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/data-table/DataTable';
import type { StudentListItem } from '@/features/people/students/types';
import { t } from '@/lib/i18n/i18n';
import type { PickColumn } from './use-student-pick';

const col = createColumnHelper<DataTableFeatures, StudentListItem>();

/** A leading checkbox column for the bulk assign; a click on it never opens the profile (the row's click). */
export const pickColumn = (pick: PickColumn) =>
  col.display({
    id: 'pick',
    header: () => <span className="sr-only">{t.assistants.brought.pickColumn}</span>,
    cell: (c) => {
      const { id, name } = c.row.original;
      return (
        <input
          type="checkbox"
          className="size-5 cursor-pointer accent-(--lapis)"
          aria-label={t.assistants.brought.pick.replace('{name}', name)}
          checked={pick.isPicked(id)}
          onClick={(e) => e.stopPropagation()}
          onChange={() => pick.toggle(id)}
        />
      );
    },
    meta: { className: 'w-px max-sm:order-0' },
  });
