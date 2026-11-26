import { ScrollView } from 'react-native';
import { t, Section } from '@ab/mobile-kit';
import { CardTitle } from '@/sales-money/components/CardTitle';
import { CurrencyTotalsBlock } from '@/sales-money/components/CurrencyTotalsBlock';
import { EarningsTermsCard } from '@/sales-money/components/EarningsTermsCard';
import { LoadState } from '@/sales-money/components/LoadState';
import { MoneyCard } from '@/sales-money/components/MoneyCard';
import { useMyEarnings } from '@/sales-money/lib/my-api';
import { MyStatementCard } from '@/sales-money/components/MyStatementCard';

const p = t.assistantPortal.earnings;

/** R-ASST-06: read-only; amounts in their own currency, never summed across currencies. */
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
          <LoadState
            status={earnings}
            empty
            emptyTitle={p.statementsEmpty}
            emptyHint={p.statementsEmptyHint}
          />
        ) : (
          d.statements.map((s) => <MyStatementCard key={s.id} statement={s} />)
        )}
      </Section>
    </ScrollView>
  );
}
