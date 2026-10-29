import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { Button, type ButtonVariant } from '@/core/ui/primitives/Button';
import { fill } from '../lib/sales-text';
import { useMoneyAction } from './use-money-action';

interface MoneyActionButtonProps {
  student: { id: string; name: string; phone?: string | null };
  subscriptionId?: string;
  /** primary on the student file (its one filled button); secondary on a list row. */
  variant?: ButtonVariant;
}

/** «تسجيل تحويل» or «تجديد» for one student, or nothing (UX review #9). */
export function MoneyActionButton({ student, subscriptionId, variant = 'primary' }: MoneyActionButtonProps) {
  const action = useMoneyAction({ studentId: student.id, ...(student.phone === undefined ? {} : { phone: student.phone }), ...(subscriptionId ? { subscriptionId } : {}) });
  if (!action) return null;
  const m = t.sales.money;
  const transfer = action.kind === 'transfer';
  return (
    <Button
      variant={variant}
      label={transfer ? m.transfer : m.renew}
      accessibilityLabel={fill(transfer ? m.transferFor : m.renewFor, { name: student.name })}
      onPress={() => router.push(action.href)}
    />
  );
}
