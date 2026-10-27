import { ACTIVITY_RESULTS, ACTIVITY_ROLES, type ActivityView } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { createColumnHelper } from '@tanstack/react-table';
import type { ColumnFilterDef, DataTableFeatures } from '@/components/DataTable';
import { StatusChip } from '@/components/ui/display/status-chip';
import { t } from '@/lib/i18n/i18n';
import { actionLabel, entityLabel, entityLink, formatAt, resultLabel, resultStyle, roleLabel } from './activity-format';
import { useClock } from '@/lib/clock';

const col = createColumnHelper<DataTableFeatures, ActivityView>();

/** Action groups (key prefixes) that have labels; any other prefix still works from the URL. */
const actionFilter: ColumnFilterDef = {
  kind: 'select',
  options: Object.keys(t.activity.actions).map((g) => ({
    value: g,
    label: g === 'authSession' ? t.activity.entities.activity : entityLabel(g),
  })),
};
const roleFilter: ColumnFilterDef = { kind: 'select', options: ACTIVITY_ROLES.map((r) => ({ value: r, label: roleLabel(r) })) };
const entityFilter: ColumnFilterDef = {
  kind: 'select',
  options: Object.keys(t.activity.entities).map((e) => ({ value: e, label: entityLabel(e) })),
};
const resultFilter: ColumnFilterDef = {
  kind: 'select',
  options: ACTIVITY_RESULTS.map((r) => ({ value: r, label: t.activity.results[r] })),
};

function EntityCell({ row }: { row: ActivityView }) {
  if (!row.entity) return <span className="text-ink-3">—</span>;
  const link = entityLink(row.entity, row.entity_id);
  const label = entityLabel(row.entity);
  return link ? (
    <Link {...link} className="text-lapis underline underline-offset-4">
      {label}
    </Link>
  ) : (
    <span className="text-ink-2">{label}</span>
  );
}

/** The row's time in the viewer's cycle (12 or 24 h). */
function AtCell({ iso }: { iso: string }) {
  return <span className="tabular-nums text-ink-2">{formatAt(iso, useClock())}</span>;
}

/**
 * «سجل النشاط» columns. Time, action, result and duration sort server-side; user (by role),
 * action (key prefix), entity and result filter (R-NFR-08). Under 640px: action + result, then
 * user and time.
 */
export const activityColumns = col.columns([
  col.accessor('at', {
    header: () => t.activity.at,
    cell: (c) => <AtCell iso={c.getValue()} />,
    meta: { className: 'whitespace-nowrap max-sm:order-4 max-sm:text-xs', sortKey: 'at' },
  }),
  col.accessor('actor_name', {
    id: 'role',
    header: () => t.activity.user,
    cell: (c) => (
      <span className="inline-flex items-center gap-2">
        <span>{c.getValue() ?? (c.row.original.actor_id ? t.activity.unknownUser : '—')}</span>
        <StatusChip tone="neutral" glyph="hollow" size="sm" label={roleLabel(c.row.original.actor_role)} />
      </span>
    ),
    meta: { className: 'max-sm:order-3', filter: roleFilter },
  }),
  col.accessor('action', {
    header: () => t.activity.action,
    cell: (c) => (
      <span className="font-semibold" title={c.getValue()}>
        {actionLabel(c.getValue(), c.row.original.entity)}
      </span>
    ),
    meta: { className: 'max-sm:order-1 max-sm:flex-[1_1_60%]', sortKey: 'action', filter: actionFilter },
  }),
  col.accessor('entity', {
    header: () => t.activity.entity,
    cell: (c) => <EntityCell row={c.row.original} />,
    meta: { className: 'max-sm:hidden', filter: entityFilter },
  }),
  col.accessor('status', {
    id: 'result',
    header: () => t.activity.result,
    cell: (c) => <StatusChip {...resultStyle(c.getValue())} size="sm" label={resultLabel(c.getValue())} />,
    meta: { className: 'max-sm:order-2', sortKey: 'status', filter: resultFilter },
  }),
  col.accessor('duration_ms', {
    header: () => t.activity.duration,
    cell: (c) => <span className="tabular-nums text-ink-3">{t.activity.ms.replace('{n}', String(c.getValue()))}</span>,
    meta: { className: 'max-sm:hidden', sortKey: 'duration_ms' },
  }),
]);
