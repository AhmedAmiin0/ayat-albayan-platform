import { router } from 'expo-router';
import { useState } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { EarningsHeader, type Tab } from './EarningsHeader';
import { PaymentsList, SessionsList } from './EarningsList';
import { useEarningsBalance, type SessionFilter } from './queries';

const MINE = {};

/**
 * «مستحقاتي» (teacher, More tab): earned, paid and outstanding, every lesson with its status and
 * the payments made to me. Read only: there is no tick and no pay button here.
 */
export function MyEarningsScreen() {
  const balance = useEarningsBalance(MINE);
  const [tab, setTab] = useState<Tab>('sessions');
  const [filter, setFilter] = useState<SessionFilter>('all');
  const header = <EarningsHeader balance={balance.data} tab={tab} onTab={setTab} filter={filter} onFilter={setFilter} />;
  return (
    <Screen>
      <ScreenHeader
        title={t.earnings.mineTitle}
        trailing={<Button variant="ghost" label={t.common.back} onPress={() => router.back()} />}
      />
      {balance.isError && !balance.data ? (
        <ErrorState onRetry={() => void balance.refetch()} message={t.earnings.mobile.loadFailed} />
      ) : tab === 'sessions' ? (
        <SessionsList scope={MINE} header={header} filter={filter} />
      ) : (
        <PaymentsList scope={MINE} header={header} />
      )}
      <Button variant="secondary" label={t.earnings.monthly} onPress={() => router.push('/teacher/more/payouts')} />
    </Screen>
  );
}
