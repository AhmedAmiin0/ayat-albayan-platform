import type { SalesPaymentView } from '@ab/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { t } from '@/lib/i18n';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { ltr } from '@/ui/Ltr';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { chosenOpen, openPackages, useSalesFamily } from './family';
import { OpenPackagePicker } from './OpenPackagePicker';
import { TransferDone } from './TransferDone';
import { TransferForm } from './TransferForm';

/** The chat's number; the package (right after «احفظ الاشتراك»). */
type Params = { phone?: string; subscriptionId?: string };

const back = () => (router.canGoBack() ? router.back() : router.replace('/inbox'));

/**
 * /inbox/sales-transfer?phone=…[&subscriptionId=…] (R-ASST-04, owner 2026-10-12): the family's bank
 * transfer for one of HER owed packages, with its receipt; it counts at once (POST /sales/payments)
 * and a paid trial makes the student «مشترك».
 */
export function SalesTransferScreen() {
  const params = useLocalSearchParams<Params>();
  const phone = params.phone ?? '';
  const family = useSalesFamily(phone);
  const open = openPackages(family.data);
  const [picked, setPicked] = useState(params.subscriptionId);
  const [done, setDone] = useState<SalesPaymentView | null>(null);
  const sub = chosenOpen(open, picked);
  return (
    <Screen>
      <ScrollView
        style={{ flex: 1, marginHorizontal: -16 }}
        contentContainerStyle={{ gap: 20, paddingHorizontal: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
      >
        <ScreenHeader
          title={t.salesMoney.stepTransfer}
          {...(sub ? { subtitle: `${sub.student.name} · ${ltr(sub.student.code)}` } : {})}
          trailing={<Button variant="ghost" label={t.common.back} onPress={back} />}
        />
        {done ? (
          <TransferDone payment={done} onDone={back} />
        ) : family.isError ? (
          <ErrorState onRetry={() => void family.refetch()} />
        ) : !family.data ? null : open.length === 0 ? (
          <EmptyState title={family.data.students.length ? t.common.empty : t.salesMoney.noOwnStudents} />
        ) : (
          <>
            <OpenPackagePicker packages={open} value={sub} onChange={setPicked} />
            {sub ? <TransferForm key={sub.id} sub={sub} phone={phone} onDone={setDone} /> : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
