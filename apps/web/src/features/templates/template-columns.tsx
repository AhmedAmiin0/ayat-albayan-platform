import { restrictedOfferable, templateStatusStyle, type TemplateView } from '@ab/shared';
import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Ltr } from '@/components/ui/ltr';
import { StatusChip } from '@/components/ui/status-chip';
import { fullTime } from '@/features/inbox/format';
import { t } from '@/lib/i18n';
import { canSubmit } from './api';
import { StarterToggle } from './StarterToggle';
import { categoryOptions, lineOptions, qualityOptions, statusOptions } from './template-filters';

const col = createColumnHelper<DataTableFeatures, TemplateView>();
const NAMES: Record<string, string | undefined> = t.templates.names;
const QUALITY: Record<string, string | undefined> = t.templates.qualityScore;

export const templateName = (key: string): string => NAMES[key] ?? key;

/** Stacked rows (< 640px) drop the table head: each value keeps its label inline. */
const Label = ({ text }: { text: string }) => <span className="text-ink-3 sm:hidden">{text}: </span>;

export interface TemplateColumnsInput {
  onSubmit: (tpl: TemplateView) => void;
  /** «متاح للمعلمين والمبيعات» (the restricted allow-list) switched for one row (owner 2026-10-12). */
  onStarter: (tpl: TemplateView, on: boolean) => void;
  /** The key whose starter flag is being saved: its switch waits. */
  saving: string | null;
}

/**
 * R-MSG-01 health table: name + Meta name, line, category, status (+ Meta's reason), quality, checked,
 * the sales starter switch. The whole registry is loaded, so it sorts and filters locally.
 */
export function templateColumns({ onSubmit, onStarter, saving }: TemplateColumnsInput) {
  return col.columns([
    // The value is the shown name, so it sorts and filters by what the row says.
    col.accessor((r) => templateName(r.key), {
      id: 'key',
      header: () => t.templates.name,
      // A template imported from Meta has no Arabic name: its Meta name shows once, as an LTR island.
      cell: (c) =>
        c.getValue() === c.row.original.meta_name ? (
          <Ltr className="font-semibold text-ink">{c.getValue()}</Ltr>
        ) : (
          <span className="grid gap-0.5">
            <span className="font-semibold text-ink">{c.getValue()}</span>
            <Ltr className="text-2xs text-ink-3">{c.row.original.meta_name}</Ltr>
          </span>
        ),
      meta: { className: 'max-sm:order-1 max-sm:flex-[1_1_100%]', filter: { kind: 'text' } },
    }),
    col.accessor('line', {
      header: () => t.templates.line,
      cell: (c) => (
        <span className="text-ink-2">
          <Label text={t.templates.line} />
          {t.enums.waLine[c.getValue()]}
        </span>
      ),
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
    col.accessor((r) => restrictedOfferable(r) && r.sales_starter, {
      id: 'sales_starter',
      header: () => t.templates.salesStarter,
      // Never offerable (a booking or reminder, a PDF, an own-button one): no switch, not a disabled one
      // (owner 2026-10-13), and it sorts as off even with a stale flag; the empty cell leaves the phone row.
      cell: (c) =>
        restrictedOfferable(c.row.original) ? (
          <span className="inline-flex items-center gap-2">
            <Label text={t.templates.salesStarter} />
            <StarterToggle
              name={templateName(c.row.original.key)}
              checked={c.getValue()}
              disabled={saving === c.row.original.key}
              onToggle={(on) => onStarter(c.row.original, on)}
            />
          </span>
        ) : null,
      meta: { className: 'max-sm:order-6 max-sm:empty:hidden' },
    }),
    col.display({
      id: 'actions',
      header: () => t.templates.actions,
      // A PDF-header template (report_ready) is submitted here too: the API uploads a sample PDF first.
      cell: (c) => {
        const tpl = c.row.original;
        if (!canSubmit(tpl)) return null;
        return (
          <Button size="sm" variant="secondary" onClick={() => onSubmit(tpl)}>
            {t.templates.submit}
          </Button>
        );
      },
      meta: { className: 'w-px max-sm:order-7', headClassName: 'w-px' },
    }),
  ]);
}
