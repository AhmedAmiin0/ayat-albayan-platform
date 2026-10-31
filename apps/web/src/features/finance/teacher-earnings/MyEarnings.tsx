import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Cartouche } from '@/components/ui/display/cartouche';
import { FormAlert } from '@/components/ui/form/form-alert';
import { PageHead } from '@/components/ui/layout/page';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { apiErrorText } from '@/features/finance/subscriptions';
import { t } from '@/lib/i18n/i18n';
import { balanceQuery, type Scope } from './api';
import { EarningsCards } from './EarningsCards';
import { PaymentsHistory } from './payments/PaymentsHistory';
import { SessionsPanel } from './SessionsPanel';

const MINE: Scope = { kind: 'mine' };

/** /teacher/earnings «أرباحي»: earned, paid and outstanding, each lesson with its status, the payments (read only). */
export function MyEarnings() {
  const balance = useQuery(balanceQuery(MINE));
  return (
    <>
      <PageHead>
        <Cartouche>{t.earnings.mineTitle}</Cartouche>
        <Link to="/teacher/payouts" className="ms-auto self-center text-sm text-lapis underline underline-offset-4">
          {t.earnings.monthly}
        </Link>
      </PageHead>
      {balance.isPending && <ListSkeleton />}
      {balance.isError && <FormAlert>{apiErrorText(balance.error, t.earnings.error)}</FormAlert>}
      {balance.data && <EarningsCards balance={balance.data} />}
      {balance.data && <SessionsPanel scope={MINE} />}
      {balance.data && <PaymentsHistory scope={MINE} />}
    </>
  );
}
