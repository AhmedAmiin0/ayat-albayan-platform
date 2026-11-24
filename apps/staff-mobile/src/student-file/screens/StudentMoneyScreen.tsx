import { useLocalSearchParams } from 'expo-router';
import { backWithin } from '@/core/nav/back-within';
import { useState } from 'react';
import { usePermissions, t, BackButton, FilterPills, Screen, ScreenHeader } from '@ab/mobile-kit';
import { useStudentName } from '@/ops/reports/use-student-name';
import { StudentInvoicesList } from '@/student-file/money/StudentInvoicesList';
import { StudentPaymentsList } from '@/student-file/money/StudentPaymentsList';

const M = t.mobileStudentFile.money;

/** Each section shows only with its permission (payments.read / invoices.read); read-only. */
export function StudentMoneyScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const can = usePermissions();
  const name = useStudentName(id, true);
  const [tab, setTab] = useState<'payments' | 'invoices'>('payments');
  const tabs = [
    ...(can('payments.read') ? [{ value: 'payments' as const, label: M.tabPayments }] : []),
    ...(can('invoices.read') ? [{ value: 'invoices' as const, label: M.tabInvoices }] : []),
  ];
  const shown = tabs.some((x) => x.value === tab) ? tab : tabs[0]?.value;
  const back = () => backWithin(`/students/${id}`);
  return (
    <Screen>
      <ScreenHeader title={M.title} subtitle={name} leading={<BackButton onPress={back} />} />
      {tabs.length > 1 ? <FilterPills items={tabs} value={shown ?? 'payments'} onChange={setTab} accessibilityLabel={M.tabsLabel} /> : null}
      {shown === 'payments' ? <StudentPaymentsList studentId={id} /> : null}
      {shown === 'invoices' ? <StudentInvoicesList studentId={id} /> : null}
    </Screen>
  );
}
