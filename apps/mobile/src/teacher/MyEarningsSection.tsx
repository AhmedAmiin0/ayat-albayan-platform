import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { Section } from '@/more/Section';
import { BalanceCards } from '@/teacher-earnings/BalanceCards';
import { PaymentHistory } from '@/teacher-earnings/PaymentHistory';
import { MY_BASE, useEarningPayments, useEarnings } from '@/teacher-earnings/queries';
import { SessionsList } from '@/teacher-earnings/SessionsList';
import { ErrorState } from '@/ui/ErrorState';

/**
 * The top of «مستحقاتي»: my balance (earned / paid / outstanding), my sessions with what is paid
 * and owed on each, and my payment history. Read-only: paying is the admin's (no pay action here).
 */
export function MyEarningsSection() {
  const earnings = useEarnings(MY_BASE);
  const payments = useEarningPayments(MY_BASE);
  const data = earnings.data;
  if (!data) {
    return earnings.isError ? <ErrorState onRetry={() => void earnings.refetch()} /> : <Note>{t.common.loading}</Note>;
  }
  return (
    <View style={{ gap: 20 }}>
      <BalanceCards balance={data.balance} />
      <Section title={t.teacherEarnings.sessionsTitle}>
        <SessionsList sessions={data.sessions} empty={t.teacherEarnings.mineEmpty} />
      </Section>
      <Section title={t.teacherEarnings.paymentsTitle}>
        <PaymentHistory payments={payments.data ?? []} />
      </Section>
    </View>
  );
}
