import type { ShortLinkRow } from '@ab/shared';
import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableColumn, DataTableFeatures } from '@/components/data-table/DataTable';
import { t } from '@ab/web-kit';
import { StateChip } from '@/features/platform/short-links/shared/LinkChips';
import type { LinkSection } from '@/features/platform/short-links/shared/link-routes';
import { ExpiryCell, OwnerCell, ShortUrlCell, TitleCell, UsageCell } from './LinkCells';

// The owner column shows only with short_links.all; phones stack each row as a card.

const C = t.shortLinks.list.columns;
const col = createColumnHelper<DataTableFeatures, ShortLinkRow>();

const usersText = (row: ShortLinkRow): string =>
  row.audience === 'anyone' ? t.shortLinks.audience.anyone : String(row.users);

function baseColumns(section: LinkSection) {
  return [
    col.display({
      id: 'title',
      header: () => C.title,
      cell: (c) => <TitleCell row={c.row.original} section={section} />,
      meta: { className: 'max-sm:order-1 max-sm:flex-[1_1_100%]' },
    }),
    col.display({
      id: 'shortUrl',
      header: () => C.shortUrl,
      cell: (c) => <ShortUrlCell row={c.row.original} />,
      meta: { className: 'max-sm:order-3 max-sm:flex-[1_1_100%]' },
    }),
    col.display({
      id: 'users',
      header: () => C.users,
      cell: (c) => <span className="tabular-nums">{usersText(c.row.original)}</span>,
      meta: { className: 'max-sm:hidden' },
    }),
    col.display({
      id: 'visitors',
      header: () => C.visitors,
      cell: (c) => <UsageCell row={c.row.original} />,
      meta: { className: 'max-sm:order-4' },
    }),
    col.display({
      id: 'expiresAt',
      header: () => C.expires,
      cell: (c) => <ExpiryCell row={c.row.original} />,
      meta: { className: 'max-sm:order-5' },
    }),
    col.display({
      id: 'status',
      header: () => C.status,
      cell: (c) => <StateChip row={c.row.original} />,
      meta: { className: 'max-sm:order-2' },
    }),
  ];
}

const ownerColumn = col.display({
  id: 'createdBy',
  header: () => C.owner,
  cell: (c) => <OwnerCell row={c.row.original} />,
  meta: { className: 'max-sm:order-6' },
});

export function linkColumns(
  section: LinkSection,
  showOwner: boolean,
): DataTableColumn<ShortLinkRow>[] {
  const base = baseColumns(section);
  return col.columns(showOwner ? [...base, ownerColumn] : base);
}
