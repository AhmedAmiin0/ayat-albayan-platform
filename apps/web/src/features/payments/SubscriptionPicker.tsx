import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { studentSubscriptionsQuery, type SubscriptionView } from '@/features/subscriptions/api';
import { moneyText, packageName } from '@/features/subscriptions/format';
import { StudentPicker, type PickedStudent } from '@/features/subscriptions/StudentPicker';
import { t } from '@/lib/i18n';

type Props = {
  student: PickedStudent | null;
  onStudent: (s: PickedStudent | null) => void;
  picked: SubscriptionView | null;
  onPick: (s: SubscriptionView | null) => void;
};

const owed = (s: SubscriptionView) => Math.max(0, s.price - s.paid);
const optionText = (s: SubscriptionView) =>
  `${packageName(s)} · ${t.enums.subscriptionStatus[s.status]} · ${t.payments.paidOf
    .replace('{paid}', moneyText(s.paid, s.currency))
    .replace('{price}', moneyText(s.price, s.currency))}`;

/**
 * Any package of any student, not only the first 100 unpaid ones: search the student (name, phone
 * or code), then choose among their packages that have not ended (unpaid, active, paused). The one
 * that still owes is chosen first.
 */
export function SubscriptionPicker({ student, onStudent, picked, onPick }: Props) {
  const list = useQuery({ ...studentSubscriptionsQuery(student?.id ?? ''), enabled: student !== null });
  const open = (list.data?.items ?? []).filter((s) => s.status !== 'expired');
  useEffect(() => {
    if (picked || open.length === 0) return;
    onPick(open.find((s) => owed(s) > 0) ?? open[0] ?? null);
  }, [open, picked, onPick]);

  if (!student) return <StudentPicker onPick={onStudent} />;
  return (
    <div className="grid gap-2">
      <p className="flex items-center gap-2 text-sm">
        <span className="font-semibold text-ink">{student.name}</span>
        <button type="button" className="text-xs text-lapis underline underline-offset-4" onClick={() => (onStudent(null), onPick(null))}>
          {t.finance.changeStudent}
        </button>
      </p>
      <Field label={t.payments.mobile.chooseSubscription} hint={list.isSuccess && open.length === 0 ? t.finance.noOpenPackages : undefined}>
        {(p) => (
          <Select {...p} value={picked?.id ?? ''} onChange={(e) => onPick(open.find((s) => s.id === e.target.value) ?? null)}>
            <option value="" disabled>
              {t.payments.mobile.chooseSubscription}
            </option>
            {open.map((s) => (
              <option key={s.id} value={s.id}>
                {optionText(s)}
              </option>
            ))}
          </Select>
        )}
      </Field>
    </div>
  );
}
