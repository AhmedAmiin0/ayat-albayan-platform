import { teacherPageOn } from '@ab/settings';
import { router } from 'expo-router';
import { useState } from 'react';
import { t, Button, BackButton, ErrorState, Screen, ScreenHeader } from '@ab/mobile-kit';
import { usePublicConfig } from '@/core/lib/query/public-config';
import { EarningsHeader, type Tab } from '@/earnings/components/EarningsHeader';
import { PaymentsList, SessionsList } from '@/earnings/components/EarningsList';
import type { SessionFilter } from '@ab/client-core';
import { useEarningsBalance } from '@/earnings/hooks/queries';

const MINE = {};

/** Read only: no tick and no pay button here. */
export function MyEarningsScreen() {
  const balance = useEarningsBalance(MINE);
  const [tab, setTab] = useState<Tab>('sessions');
  const [filter, setFilter] = useState<SessionFilter>('all');
  const statements = teacherPageOn(usePublicConfig(), 'statements');
  const header = <EarningsHeader balance={balance.data} tab={tab} onTab={setTab} filter={filter} onFilter={setFilter} />;
  return (
    <Screen>
      <ScreenHeader
        title={t.earnings.mineTitle}
        leading={<BackButton onPress={() => router.back()} />}
      />
      {balance.isError && !balance.data ? (
        <ErrorState onRetry={() => void balance.refetch()} message={t.earnings.mobile.loadFailed} />
      ) : tab === 'sessions' ? (
        <SessionsList scope={MINE} header={header} filter={filter} />
      ) : (
        <PaymentsList scope={MINE} header={header} />
      )}
      {statements && (
        <Button variant="secondary" label={t.earnings.monthly} onPress={() => router.push('/teacher/more/payouts')} />
      )}
    </Screen>
  );
}
