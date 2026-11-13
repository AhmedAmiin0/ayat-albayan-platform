import { teacherPageOn } from '@ab/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import { usePublicConfig } from '@/core/lib/query/public-config';
import { Button } from '@/core/ui/primitives/Button';
import { BackButton } from '@/core/ui/navigation';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { EarningsHeader, type Tab } from '@/earnings/components/EarningsHeader';
import { PaymentsList, SessionsList } from '@/earnings/components/EarningsList';
import { useEarningsBalance, type SessionFilter } from '@/earnings/hooks/queries';

const MINE = {};

/**
 * «مستحقاتي» (teacher, More tab): earned, paid and outstanding, every lesson with its status and
 * the payments made to me. Read only: there is no tick and no pay button here.
 */
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
