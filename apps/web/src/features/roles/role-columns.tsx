import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/DataTable';
import { StatusChip } from '@/components/ui/status-chip';
import { t } from '@/lib/i18n';
import type { RoleView } from './api';
import { RoleActions, type RoleAction } from './RoleActions';

const col = createColumnHelper<DataTableFeatures, RoleView>();
const baseName = t.roles.base as Record<string, string>;

/** Name, base role, system badge, user count, actions. */
export const roleColumns = (onAction: (r: RoleView, a: RoleAction) => void, canManage: boolean) =>
  col.columns([
    col.accessor('name_ar', {
      header: () => t.roles.list.name,
      cell: (c) => (
        <span className="grid">
          <span className="font-semibold text-ink">{c.getValue()}</span>
          <span dir="ltr" className="text-start text-xs text-ink-3">{c.row.original.name_en} · {c.row.original.key}</span>
        </span>
      ),
    }),
    col.accessor('base_role', {
      header: () => t.roles.list.base,
      cell: (c) => <span className="text-ink-2">{baseName[c.getValue()] ?? c.getValue()}</span>,
    }),
    col.accessor('is_system', {
      header: () => t.roles.list.type,
      cell: (c) =>
        c.getValue() ? (
          <StatusChip tone="neutral" glyph="fill" size="sm" label={t.roles.type.system} />
        ) : (
          <StatusChip tone="neutral" glyph="hollow" size="sm" label={t.roles.type.custom} />
        ),
    }),
    col.accessor('user_count', {
      header: () => t.roles.list.users,
      cell: (c) => <span className="tabular-nums">{c.getValue()}</span>,
    }),
    col.display({
      id: 'actions',
      header: () => t.common.actions,
      cell: (c) => <RoleActions role={c.row.original} onAction={onAction} canManage={canManage} />,
    }),
  ]);
