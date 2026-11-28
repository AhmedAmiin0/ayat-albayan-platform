import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/data-table/DataTable';
import { t } from '@ab/web-kit';
import type { PickColumn } from './use-student-pick';
import type { StudentListItem } from '@ab/shared';

const col = createColumnHelper<DataTableFeatures, StudentListItem>();

/** A leading checkbox column for bulk assign; its click never opens the profile. */
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
