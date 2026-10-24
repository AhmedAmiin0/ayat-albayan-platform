import type { NumberView, TemplateView } from '@ab/shared';
import { Select } from '@/components/ui/select';
import { t } from '@/lib/i18n';
import { approvalRows } from './number-approvals';
import { NumberApprovals } from './NumberApprovals';
import { Label, templateName } from './template-cells';

const s = t.templates.sendFrom;

export interface SendFromCellProps {
  tpl: TemplateView;
  /** GET /admin/numbers; undefined while loading or when unreadable. */
  numbers: readonly NumberView[] | undefined;
  /** templates.manage: the select; otherwise the number as text. */
  manage: boolean;
  /** A number picked (null = the role's default): the caller confirms before saving. */
  onPick: (tpl: TemplateView, numberId: string | null) => void;
}

const optionText = (n: NumberView) =>
  s.option.replace('{label}', n.label).replace('{role}', t.numbers.purpose[n.purpose]);

/**
 * «يُرسل من» (docs/23c decision 9): the template's own number, or its role's default. Editable with
 * templates.manage once the API carries number_id (an older API: read-only), then the per-number
 * approval chips.
 */
export function SendFromCell({ tpl, numbers, manage, onPick }: SendFromCellProps) {
  const name = templateName(tpl.key);
  const own = numbers?.find((n) => n.id === tpl.number_id);
  const editable = manage && tpl.number_id !== undefined && numbers !== undefined;
  return (
    <span className="grid min-w-[14rem] justify-items-start gap-1.5">
      {editable ? (
        <Select
          aria-label={s.labelFor.replace('{name}', name)}
          value={tpl.number_id ?? ''}
          onChange={(e) => onPick(tpl, e.target.value === '' ? null : e.target.value)}
        >
          <option value="">{s.roleDefault}</option>
          {numbers.map((n) => (
            <option key={n.id} value={n.id}>
              {optionText(n)}
            </option>
          ))}
        </Select>
      ) : (
        <span className="text-ink-2">
          <Label text={s.header} />
          <bdi>{own ? optionText(own) : s.roleDefault}</bdi>
        </span>
      )}
      {numbers && tpl.numbers !== undefined && (
        <NumberApprovals rows={approvalRows(tpl, numbers)} name={name} />
      )}
    </span>
  );
}
