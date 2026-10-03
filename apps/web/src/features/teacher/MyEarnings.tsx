import { useQuery } from '@tanstack/react-query';
import { FormAlert } from '@/components/ui/form-alert';
import { BalanceCards } from '@/features/teacher-earnings/BalanceCards';
import { EarningsTable } from '@/features/teacher-earnings/EarningsTable';
import { PaymentHistory } from '@/features/teacher-earnings/PaymentHistory';
import { teacherEarningsQuery, teacherPaymentsQuery } from '@/features/teacher-earnings/api';
import { t } from '@/lib/i18n';

/** «مستحقاتي» top half (read-only): balance, one row per session, my payment history (no receipts). */
export function MyEarnings() {
  const earnings = useQuery(teacherEarningsQuery('me'));
  const payments = useQuery(teacherPaymentsQuery('me'));
  if (earnings.isError) return <FormAlert>{t.common.error}</FormAlert>;
  if (!earnings.data) return <p className="py-6 text-center text-ink-3">{t.common.loading}</p>;
  return (
    <>
      <BalanceCards balance={earnings.data.balance} />
      <EarningsTable sessions={earnings.data.sessions} emptyText={t.teacherEarnings.mineEmpty} />
      <PaymentHistory payments={payments.data ?? []} />
    </>
  );
}
