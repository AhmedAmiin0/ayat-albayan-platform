import { ScrollView } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Section } from '@/more/Section';
import { CardTitle } from '../components/CardTitle';
import { CurrencyTotalsBlock } from '../components/CurrencyTotalsBlock';
import { EarningsTermsCard } from '../components/EarningsTermsCard';
import { LoadState } from '../components/LoadState';
import { MoneyCard } from '../components/MoneyCard';
import { useMyEarnings } from '../lib/my-api';
import { MyStatementCard } from '../components/MyStatementCard';

const p = t.assistantPortal.earnings;

/**
 * «الكشوف» of «محفظتي» (web MyEarnings, R-ASST-06), read-only: my terms, this month so far and my monthly
 * statements, every amount in its own currency (never summed across them). The commissions and the
 * balance are «العمولات» (MyWalletView).
 */
export function MyEarningsView() {
  const earnings = useMyEarnings();
  const d = earnings.data;
  if (!d) return <LoadState status={earnings} empty={false} emptyTitle="" />;
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
      <EarningsTermsCard terms={d.terms} />
      <MoneyCard>
        <CardTitle>{p.thisMonth}</CardTitle>
        <CurrencyTotalsBlock totals={d.this_month} label={p.thisMonth} />
      </MoneyCard>
      <Section title={p.statements}>
        {d.statements.length === 0 ? (
          <LoadState status={earnings} empty emptyTitle={p.statementsEmpty} emptyHint={p.statementsEmptyHint} />
        ) : (
          d.statements.map((s) => <MyStatementCard key={s.id} statement={s} />)
        )}
      </Section>
    </ScrollView>
  );
}
