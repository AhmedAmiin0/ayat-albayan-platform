import type { SalesMoneySubscriptionView } from '@ab/shared';
import { Field } from '@/components/ui/form/field';
import { Select } from '@/components/ui/form/select';
import { packageName, studentLabel } from '@/features/finance/subscriptions';
import { t } from '@/lib/i18n/i18n';
import { dueLine } from './due-line';

type Props = {
  packages: SalesMoneySubscriptionView[];
  value: string;
  onChange: (id: string) => void;
};

/** One of her packages still owed (opened from «سجّل تحويلًا بنكيًا»): the child, the package and what is due. */
export function PackagePicker({ packages, value, onChange }: Props) {
  return (
    <Field label={t.subscriptions.package}>
      {(p) => (
        <Select {...p} value={value} onChange={(e) => onChange(e.target.value)}>
          {packages.length > 1 && <option value="">{t.subscriptions.package}</option>}
          {packages.map((s) => (
            <option key={s.id} value={s.id}>
              {studentLabel(s.student)} · {packageName(s)} · {dueLine(s)}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}
