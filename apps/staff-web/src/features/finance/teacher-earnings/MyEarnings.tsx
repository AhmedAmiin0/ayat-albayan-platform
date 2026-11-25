import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Cartouche, FormAlert, PageHead, ListSkeleton, t } from '@ab/web-kit';
import { apiErrorText } from '@/features/finance/subscriptions';
import { useTeacherPageOn } from '@/lib/settings/teacher-pages';
import { balanceQuery, type Scope } from './api';
import { EarningsCards } from './EarningsCards';
import { PaymentsHistory } from './payments/PaymentsHistory';
import { SessionsPanel } from './SessionsPanel';

const MINE: Scope = { kind: 'mine' };

/** Read-only. */
export function MyEarnings() {
  const balance = useQuery(balanceQuery(MINE));
  const pageOn = useTeacherPageOn();
  return (
    <>
      <PageHead>
        <Cartouche>{t.earnings.mineTitle}</Cartouche>
        {pageOn('statements') && (
          <Link to="/teacher/payouts" className="ms-auto self-center text-sm text-lapis underline underline-offset-4">
            {t.earnings.monthly}
          </Link>
        )}
      </PageHead>
      {balance.isPending && <ListSkeleton />}
      {balance.isError && <FormAlert>{apiErrorText(balance.error, t.earnings.error)}</FormAlert>}
      {balance.data && <EarningsCards balance={balance.data} />}
      {balance.data && <SessionsPanel scope={MINE} />}
      {balance.data && <PaymentsHistory scope={MINE} />}
    </>
  );
}
