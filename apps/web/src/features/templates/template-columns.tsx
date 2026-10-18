import { templateStatusStyle, type TemplateView } from '@ab/shared';
import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/DataTable';
import { StatusChip } from '@/components/ui/status-chip';
import { fullTime } from '@/features/inbox/format';
import { t } from '@/lib/i18n';
import { StarterToggle } from './StarterToggle';
import { Label, NameCell, NumberCell, RowActions, templateName } from './template-cells';
import type { PhoneMap } from './use-template-lines';
import { categoryOptions, lineOptions, qualityOptions, statusOptions } from './template-filters';

const col = createColumnHelper<DataTableFeatures, TemplateView>();
const QUALITY: Record<string, string | undefined> = t.templates.qualityScore;

export interface TemplateColumnsInput {
  onSubmit: (tpl: TemplateView) => void;
  /** «نقل إلى الرقم الآخر» asked for one row (it confirms in its dialog). */
  onMove: (tpl: TemplateView) => void;
  /** Each number's formatted phone, when a lines check has run. */
  phones: PhoneMap;
  /** «متاح للمعلمين والمبيعات» (the restricted allow-list) switched for one row (owner 2026-10-12). */
  onStarter: (tpl: TemplateView, on: boolean) => void;
  /** The key whose starter flag is being saved: its switch waits. */
  saving: string | null;
}

/**
 * R-MSG-01 health table: name + Meta name, number, category, status (+ Meta's reason), quality, checked,
 * the sales starter switch. The whole registry is loaded, so it sorts and filters locally.
 */
export function templateColumns({ onSubmit, onMove, onStarter, saving, phones }: TemplateColumnsInput) {
  return col.columns([
    // The value is the shown name, so it sorts and filters by what the row says.
    col.accessor((r) => templateName(r.key), {
      id: 'key',
      header: () => t.templates.name,
      cell: (c) => <NameCell name={c.getValue()} tpl={c.row.original} />,
      meta: { className: 'max-sm:order-1 max-sm:flex-[1_1_100%]', filter: { kind: 'text' } },
    }),
    // «الرقم» (owner 2026-10-18): the number a row goes out from; still filtered by line.
    col.accessor('line', {
      header: () => t.templates.number,
      cell: (c) => <NumberCell line={c.getValue()} phone={phones[c.getValue()]} />,
      meta: { className: 'max-sm:order-3', filter: { kind: 'select', options: lineOptions() } },
    }),
    col.accessor('category', {
      header: () => t.templates.category,
      cell: (c) => (
        <span className="text-ink-2">
          <Label text={t.templates.category} />
          {t.enums.templateCategory[c.getValue()]}
        </span>
      ),
      meta: { className: 'max-sm:order-3', filter: { kind: 'select', options: categoryOptions() } },
    }),
    col.accessor('status', {
      header: () => t.templates.status,
      cell: (c) => (
        <span className="grid justify-items-start gap-1">
          <StatusChip size="sm" {...templateStatusStyle[c.getValue()]} label={t.enums.templateStatus[c.getValue()]} />
          {c.row.original.last_error && (
            <span className="max-w-[28ch] text-2xs whitespace-normal text-danger">{c.row.original.last_error}</span>
          )}
        </span>
      ),
      meta: { className: 'max-sm:order-2', filter: { kind: 'select', options: statusOptions() } },
    }),
    col.accessor('quality', {
      header: () => t.templates.quality,
      // Meta's quality only means something for an approved template; a rejected one shows «—».
      cell: (c) => (
        <span className="text-ink-2">
          <Label text={t.templates.quality} />
          {c.row.original.status === 'approved' ? (QUALITY[c.getValue() ?? 'UNKNOWN'] ?? c.getValue()) : '—'}
        </span>
      ),
      meta: { className: 'max-sm:order-4', filter: { kind: 'select', options: qualityOptions() } },
    }),
    col.accessor('last_checked_at', {
      header: () => t.templates.lastChecked,
      cell: (c) => {
        const at = c.getValue();
        return (
          <span>
            <Label text={t.templates.lastChecked} />
            {at ? (
              <time dateTime={at} className="tabular-nums text-ink-2">
                {fullTime(at)}
              </time>
            ) : (
              <span className="text-ink-3">{t.templates.neverChecked}</span>
            )}
          </span>
        );
      },
      meta: { className: 'max-sm:order-5' },
    }),
    col.accessor('sales_starter', {
      header: () => t.templates.salesStarter,
      cell: (c) => (
        <span className="inline-flex items-center gap-2">
          <Label text={t.templates.salesStarter} />
          <StarterToggle
            name={templateName(c.row.original.key)}
            checked={c.getValue()}
            disabled={saving === c.row.original.key}
            onToggle={(on) => onStarter(c.row.original, on)}
          />
        </span>
      ),
      meta: { className: 'max-sm:order-6' },
    }),
    col.display({
      id: 'actions',
      header: () => t.templates.actions,
      cell: (c) => <RowActions tpl={c.row.original} onSubmit={onSubmit} onMove={onMove} />,
      meta: { className: 'max-sm:order-7', headClassName: 'w-px' },
    }),
  ]);
}
