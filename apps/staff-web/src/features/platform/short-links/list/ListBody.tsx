import type { ShortLinkPage } from '@ab/shared';
import { DataTable } from '@/components/data-table/DataTable';
import { TableBox } from '@/components/data-table/TableBox';
import { EmptyState, ListSkeleton, Button, FormAlert, t } from '@ab/web-kit';
import type { LinkSection } from '@/features/platform/short-links/shared/link-routes';
import { linkColumns } from './link-columns';

const L = t.shortLinks.list;

interface ListBodyProps {
  section: LinkSection;
  showOwner: boolean;
  list: { data?: ShortLinkPage | undefined; isError: boolean; refetch: () => unknown };
  filtered: boolean;
  onNew: () => void;
  onClear: () => void;
}

/** Nothing made yet: the invitation to make the first link. */
type EmptyProps = Omit<ListBodyProps, 'section' | 'showOwner' | 'list'>;

function Empty({ filtered, onNew, onClear }: EmptyProps) {
  const action = filtered ? (
    <Button variant="secondary" onClick={onClear}>{L.clearFilters}</Button>
  ) : (
    <Button onClick={onNew}>{t.shortLinks.new}</Button>
  );
  return (
    <TableBox center>
      <EmptyState title={filtered ? L.emptyFiltered : L.empty} action={action} />
    </TableBox>
  );
}

/** The table, or the loading, failed and empty states (board LinkXWebList). */
export function ListBody({ section, showOwner, list, filtered, onNew, onClear }: ListBodyProps) {
  if (list.isError) {
    return (
      <FormAlert>
        <span className="flex flex-wrap items-center gap-3">
          {L.loadError}
          <Button variant="secondary" size="sm" onClick={() => void list.refetch()}>
            {L.retry}
          </Button>
        </span>
      </FormAlert>
    );
  }
  if (!list.data) return <ListSkeleton />;
  if (list.data.total === 0) return <Empty filtered={filtered} onNew={onNew} onClear={onClear} />;
  return (
    <DataTable
      stacked
      label={t.shortLinks.title}
      columns={linkColumns(section, showOwner)}
      data={list.data.rows}
      getRowId={(r) => r.code}
    />
  );
}
