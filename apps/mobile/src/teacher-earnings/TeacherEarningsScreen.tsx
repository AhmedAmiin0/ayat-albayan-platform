import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { Section } from '@/more/Section';
import { Button } from '@/ui/Button';
import { ErrorState } from '@/ui/ErrorState';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { BalanceCards } from './BalanceCards';
import { PayBar } from './PayBar';
import { PaymentHistory } from './PaymentHistory';
import { teacherBase, useEarningPayments, useEarnings } from './queries';
import { toggleAll, toggleId } from './selection';
import { SessionsList } from './SessionsList';

/**
 * «مستحقات المعلم/ة» (admin, per session): the balance, the sessions with tick boxes, the payment
 * history and «سجّل دفعة» (a sheet). Reached from More > المعلمين > teacher > «مستحقات».
 */
export function TeacherEarningsScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const base = teacherBase(id);
  const earnings = useEarnings(base);
  const payments = useEarningPayments(base);
  const [selected, setSelected] = useState<string[]>([]);
  const data = earnings.data;
  const back = <Button variant="ghost" label={t.common.back} onPress={() => router.back()} />;

  if (!data) {
    return (
      <Screen>
        <ScreenHeader title={t.teacherEarnings.title} trailing={back} />
        {earnings.isError ? <ErrorState onRetry={() => void earnings.refetch()} /> : <Note>{t.common.loading}</Note>}
      </Screen>
    );
  }
  return (
    <Screen>
      <ScrollView
        style={{ flex: 1, marginHorizontal: -16 }}
        contentContainerStyle={{ gap: 20, paddingHorizontal: 16, paddingBottom: 32 }}
      >
        <ScreenHeader title={t.teacherEarnings.titleFor.replace('{name}', data.teacher.display_name_ar)} trailing={back} />
        <BalanceCards balance={data.balance} />
        <Section title={t.teacherEarnings.sessionsTitle}>
          <SessionsList
            sessions={data.sessions}
            empty={t.teacherEarnings.empty}
            selection={{
              selected,
              onToggle: (sid) => setSelected((s) => toggleId(s, sid)),
              onToggleAll: () => setSelected((s) => toggleAll(data.sessions, s)),
            }}
          />
        </Section>
        <PayBar base={base} view={data} selected={selected} onPaid={() => setSelected([])} />
        <Section title={t.teacherEarnings.paymentsTitle}>
          <PaymentHistory payments={payments.data ?? []} />
        </Section>
      </ScrollView>
    </Screen>
  );
}
