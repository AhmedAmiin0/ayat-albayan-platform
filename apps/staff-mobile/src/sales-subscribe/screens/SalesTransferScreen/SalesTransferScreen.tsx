import { chatBinding, type SalesPaymentView } from '@ab/shared';
import { cancelOffered } from '@ab/money';
import { useLocalSearchParams } from 'expo-router';
import { backWithin } from '@/core/nav/back-within';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import {
  apiSend,
  t,
  BackButton,
  EmptyState,
  ErrorState,
  ltr,
  Screen,
  ScreenHeader,
} from '@ab/mobile-kit';
import { CancelPackage } from '@/payments';
import { inTree, useTreeBase } from '@/core/nav/tree-base';
import { chosenOpen, openPackages, useSalesFamily } from '@/sales-subscribe/lib/family';
import { salesKeys } from '@/core/lib/keys';
import { OpenPackagePicker } from '@/sales-subscribe/components/OpenPackagePicker';
import { TransferDone } from '@/sales-subscribe/components/TransferDone';
import { TransferForm } from '@/sales-subscribe/components/TransferForm';

type Params = { phone?: string; subscriptionId?: string };

/** Bank transfer for her owed package (R-ASST-04); a paid trial makes the student subscribed. */
export function SalesTransferScreen() {
  const params = useLocalSearchParams<Params>();
  const phone = params.phone ?? '';
  const family = useSalesFamily(phone);
  const open = openPackages(family.data);
  const [picked, setPicked] = useState(params.subscriptionId);
  const [done, setDone] = useState<SalesPaymentView | null>(null);
  const sub = chosenOpen(open, picked);
  // A child not hers (sales.renew_any, docs/16 row 38) gets the transfer only, never cancel.
  const bind = sub ? chatBinding(family.data?.students ?? [], { studentId: sub.student.id, phone }) : {};
  const base = useTreeBase();
  const back = () => backWithin(inTree(base, '/inbox'));
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
          leading={<BackButton onPress={back} />}
        />
        {done ? (
          <TransferDone payment={done} onDone={back} />
        ) : family.isError ? (
          <ErrorState onRetry={() => void family.refetch()} />
        ) : !family.data ? null : open.length === 0 ? (
          <EmptyState title={family.data.students.length ? t.salesMoney.nothingDue : t.salesMoney.noOwnStudents} />
        ) : (
          <>
            <OpenPackagePicker packages={open} value={sub} onChange={setPicked} />
            {sub && cancelOffered(sub) && !bind.phone ? (
              <CancelPackage
                key={`cancel-${sub.id}`}
                cancel={(body) => apiSend('POST', `/sales/subscriptions/${sub.id}/cancel`, body)}
                stale={[salesKeys.family(phone)]}
              />
            ) : null}
            {sub ? <TransferForm key={sub.id} sub={sub} phone={phone} bind={bind} onDone={setDone} /> : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
