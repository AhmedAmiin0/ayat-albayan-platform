import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { usePermissions } from '@/auth/use-permissions';
import { t } from '@/core/lib/i18n/i18n';
import { useStudentName } from '@/ops/reports/use-student-name';
import { Button } from '@/core/ui/primitives/Button';
import { FilterPills } from '@/core/ui/form/FilterPills';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { StudentInvoicesList } from '../money/StudentInvoicesList';
import { StudentPaymentsList } from '../money/StudentPaymentsList';

const M = t.mobileStudentFile.money;

/**
 * «المدفوعات والفواتير» of one student (web: StudentPayments + StudentInvoices): two sections behind
 * pills, each shown only if its permission (payments.read / invoices.read) is held. Read-only.
 */
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
  const back = () => (router.canGoBack() ? router.back() : router.replace(`/students/${id}`));
  return (
    <Screen>
      <ScreenHeader title={M.title} subtitle={name} trailing={<Button variant="ghost" label={t.common.back} onPress={back} />} />
      {tabs.length > 1 ? <FilterPills items={tabs} value={shown ?? 'payments'} onChange={setTab} accessibilityLabel={M.tabsLabel} /> : null}
      {shown === 'payments' ? <StudentPaymentsList studentId={id} /> : null}
      {shown === 'invoices' ? <StudentInvoicesList studentId={id} /> : null}
    </Screen>
  );
}
