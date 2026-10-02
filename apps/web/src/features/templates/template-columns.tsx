import { templateStatusStyle, type TemplateView } from '@ab/shared';
import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Ltr } from '@/components/ui/ltr';
import { StatusChip } from '@/components/ui/status-chip';
import { fullTime } from '@/features/inbox/format';
import { t } from '@/lib/i18n';
import { canSubmit } from './api';

const col = createColumnHelper<DataTableFeatures, TemplateView>();
const NAMES: Record<string, string | undefined> = t.templates.names;
const QUALITY: Record<string, string | undefined> = t.templates.qualityScore;

export const templateName = (key: string): string => NAMES[key] ?? key;

/** Stacked rows (< 640px) drop the table head: each value keeps its label inline. */
const Label = ({ text }: { text: string }) => <span className="text-ink-3 sm:hidden">{text}: </span>;

/** R-MSG-01 health table: name + Meta name, category, status (+ Meta's reason), quality, checked. */
export function templateColumns({ onSubmit }: { onSubmit: (tpl: TemplateView) => void }) {
  return col.columns([
    col.accessor('key', {
      header: () => t.templates.name,
      cell: (c) => (
        <span className="grid gap-0.5">
          <span className="font-semibold text-ink">{templateName(c.getValue())}</span>
          <Ltr className="text-2xs text-ink-3">{c.row.original.meta_name}</Ltr>
        </span>
      ),
      meta: { className: 'max-sm:order-1 max-sm:flex-[1_1_100%]' },
    }),
    col.accessor('category', {
      header: () => t.templates.category,
      cell: (c) => (
        <span className="text-ink-2">
          <Label text={t.templates.category} />
          {t.enums.templateCategory[c.getValue()]}
        </span>
      ),
      meta: { className: 'max-sm:order-3' },
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
      meta: { className: 'max-sm:order-2' },
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
      meta: { className: 'max-sm:order-4' },
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
    col.display({
      id: 'actions',
      header: () => t.templates.actions,
      // A PDF-header template can't be submitted from here (409 needs_manual_submit): say where instead.
      cell: (c) => {
        const tpl = c.row.original;
        if (!canSubmit(tpl)) return null;
        if (tpl.header_format === 'document') {
          return <p className="max-w-[32ch] text-2xs whitespace-normal text-ink-2">{t.templates.manualSubmit}</p>;
        }
        return (
          <Button size="sm" variant="secondary" onClick={() => onSubmit(tpl)}>
            {t.templates.submit}
          </Button>
        );
      },
      meta: { className: 'w-px max-sm:order-6', headClassName: 'w-px' },
    }),
  ]);
}
