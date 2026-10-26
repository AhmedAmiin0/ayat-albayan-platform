import type { NumberView, TemplateView } from '@ab/shared';
import { Select } from '@/components/ui/form/select';
import { t } from '@/lib/i18n/i18n';
import { approvalRows } from '../numbers/number-approvals';
import { NumberApprovals } from '../numbers/NumberApprovals';
import { Label, templateName } from '../template-cells';

const s = t.templates.sendFrom;

export interface SendFromCellProps {
  tpl: TemplateView;
  /** GET /admin/numbers; undefined while loading or when unreadable. */
  numbers: readonly NumberView[] | undefined;
  /** templates.manage: the select; otherwise the number as text. */
  manage: boolean;
  /** A number picked (null = the role's default): the caller confirms before saving. */
  onPick: (tpl: TemplateView, numberId: string | null) => void;
  /** A «يُرسل من» save is in flight: every select waits. */
  busy?: boolean;
}

/** «{label} ({role})», plus «(متوقف)» for a disabled number. */
const optionText = (n: NumberView) => {
  const text = s.option.replace('{label}', n.label).replace('{role}', t.numbers.purpose[n.purpose]);
  return n.enabled ? text : `${text} ${s.disabledMark}`;
};

/** The read-only text: the template's number, the role default, or a neutral label for a number not in the list. */
function readOnlyText(tpl: TemplateView, own: NumberView | undefined): string {
  if (own) return optionText(own);
  return tpl.number_id ? s.unknownNumber : s.roleDefault;
}

interface SendFromSelectProps {
  tpl: TemplateView;
  numbers: readonly NumberView[];
  cell: Pick<SendFromCellProps, 'onPick' | 'busy'>;
}

/** The editable select; a saved number missing from the list is its own disabled option, so the select never shows the default. */
function SendFromSelect({ tpl, numbers, cell }: SendFromSelectProps) {
  const missing = tpl.number_id && !numbers.some((n) => n.id === tpl.number_id) ? tpl.number_id : null;
  return (
    <>
      <span className="text-ink-2">
        <Label text={s.header} />
      </span>
      <Select
        aria-label={s.labelFor.replace('{name}', templateName(tpl.key))}
        value={tpl.number_id ?? ''}
        disabled={cell.busy}
        onChange={(e) => cell.onPick(tpl, e.target.value === '' ? null : e.target.value)}
      >
        <option value="">{s.roleDefault}</option>
        {missing && (
          <option value={missing} disabled>
            {s.unknownNumber}
          </option>
        )}
        {numbers.map((n) => (
          <option key={n.id} value={n.id}>
            {optionText(n)}
          </option>
        ))}
      </Select>
    </>
  );
}

/**
 * «يُرسل من» (docs/23c decision 9): the template's own number, or its role's default. Editable with
 * templates.manage once the API carries number_id (an older API: read-only), then the per-number
 * approval chips.
 */
export function SendFromCell({ tpl, numbers, manage, onPick, busy = false }: SendFromCellProps) {
  const name = templateName(tpl.key);
  const editable = manage && tpl.number_id !== undefined && numbers !== undefined;
  return (
    <span className="grid min-w-[14rem] justify-items-start gap-1.5">
      {editable ? (
        <SendFromSelect tpl={tpl} numbers={numbers} cell={{ onPick, busy }} />
      ) : (
        <span className="text-ink-2">
          <Label text={s.header} />
          <bdi>{readOnlyText(tpl, numbers?.find((n) => n.id === tpl.number_id))}</bdi>
        </span>
      )}
      {numbers && tpl.numbers !== undefined && (
        <NumberApprovals rows={approvalRows(tpl, numbers)} name={name} />
      )}
    </span>
  );
}
