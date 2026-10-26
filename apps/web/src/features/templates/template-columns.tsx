import { type TemplateLineView, type TemplateView, type WaLine } from '@ab/shared';
import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/DataTable';
import { fullTime } from '@/features/inbox/format';
import { t } from '@/lib/i18n/i18n';
import { CrmNameButton } from './crm/CrmNameButton';
import { CrmStatusActions, type CrmStatusActionsProps } from './crm/CrmStatusActions';
import { SendFromCell, type SendFromCellProps } from './lines/SendFromCell';
import { StarterToggle } from './StarterToggle';
import { otherLine } from './api';
import { Label, NameCell, NumberCell, RowActions, StatusCell, templateName } from './template-cells';
import type { PhoneMap } from './lines/use-template-lines';
import { categoryOptions, lineOptions, qualityOptions, statusOptions } from './template-filters';

const col = createColumnHelper<DataTableFeatures, TemplateView>();
const QUALITY: Record<string, string | undefined> = t.templates.qualityScore;

export interface TemplateColumnsInput {
  onSubmit: (tpl: TemplateView) => void;
  /** «نقل إلى الرقم الآخر» asked for one row (it confirms in its dialog). */
  onMove: (tpl: TemplateView) => void;
  /** Each number's formatted phone, when a lines check has run. */
  phones: PhoneMap;
  /** The server's facts for a number (a move to an unconfigured one is disabled). */
  factsOf: (line: WaLine) => TemplateLineView | undefined;
  /** «متاح للمعلمين والمبيعات» (the restricted allow-list) switched for one row (owner 2026-10-12). */
  onStarter: (tpl: TemplateView, on: boolean) => void;
  /** The key whose starter flag is being saved: its switch waits. */
  saving: string | null;
  /** «يُرسل من» (docs/23c decision 9): the numbers, templates.manage, and a pick (confirmed by the caller). */
  sendFrom: Omit<SendFromCellProps, 'tpl'>;
  /** A crm line's rows (docs/19): the status set by hand (`busy` = the key being saved) and its CRM name. */
  crmStatus: { busyKey: string | null; onSet: CrmStatusActionsProps['onSet']; onEditName: (tpl: TemplateView) => void };
}

/**
 * R-MSG-01 health table: name + Meta name, number, «يُرسل من» + per-number approvals, category, status (+ Meta's reason), quality, checked,
 * the sales starter switch. The whole registry is loaded, so it sorts and filters locally.
 */
export function templateColumns({ onSubmit, onMove, onStarter, saving, phones, factsOf, sendFrom, crmStatus }: TemplateColumnsInput) {
  const crmCell = (tpl: TemplateView) =>
    factsOf(tpl.line)?.provider === 'crm' ? (
      <>
        <CrmStatusActions tpl={tpl} busy={crmStatus.busyKey === tpl.key} onSet={crmStatus.onSet} />
        <CrmNameButton tpl={tpl} onEdit={crmStatus.onEditName} />
      </>
    ) : undefined;
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
    col.display({
      id: 'send_from',
      header: () => t.templates.sendFrom.header,
      cell: (c) => <SendFromCell tpl={c.row.original} {...sendFrom} />,
      meta: { className: 'max-sm:order-3 max-sm:flex-[1_1_100%]' },
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
      cell: (c) => <StatusCell tpl={c.row.original} crm={factsOf(c.row.original.line)?.provider === 'crm'} />,
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
      cell: (c) => (
        <RowActions tpl={c.row.original} onSubmit={onSubmit} onMove={onMove} target={factsOf(otherLine(c.row.original.line))} crm={crmCell(c.row.original)} />
      ),
      meta: { className: 'max-sm:order-7', headClassName: 'w-px' },
    }),
  ]);
}
