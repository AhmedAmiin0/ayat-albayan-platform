import type { SalesMoneySubscriptionView } from '@ab/shared';
import { Field, Select, t } from '@ab/web-kit';
import { packageName, studentLabel } from '@/features/finance/subscriptions';
import { dueLine } from './due-line';

interface Props {
  packages: SalesMoneySubscriptionView[];
  value: string;
  onChange: (id: string) => void;
}

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
