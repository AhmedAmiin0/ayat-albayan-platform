import { ScrollView, View } from 'react-native';
import { t } from '@/lib/i18n';
import { Section } from '@/more/Section';
import { Note } from '@/more/Note';
import { AmountText } from './AmountText';
import { CardTitle } from './CardTitle';
import { CurrencyTotalsBlock } from './CurrencyTotalsBlock';
import { EarningsTermsCard } from './EarningsTermsCard';
import { LoadState } from './LoadState';
import { MoneyCard } from './MoneyCard';
import { byCurrency } from './money-text';
import { useMyEarnings } from './my-api';
import { MyStatementCard } from './MyStatementCard';

const p = t.assistantPortal.earnings;

/**
 * «أرباحي» (web MyEarnings, R-ASST-06), read-only: my terms, this month so far, the commissions I
 * earned and my monthly statements, every amount in its own currency (never summed across them).
 */
export function MyEarningsView() {
  const earnings = useMyEarnings();
  const d = earnings.data;
  if (!d) return <LoadState status={earnings} empty={false} emptyTitle="" />;
  const commissions = byCurrency(d.commissions_total);
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
      <EarningsTermsCard terms={d.terms} />
      <MoneyCard>
        <CardTitle>{p.thisMonth}</CardTitle>
        <CurrencyTotalsBlock totals={d.this_month} label={p.thisMonth} />
        {commissions.length > 0 ? (
          <View accessibilityLabel={p.commissionsTotal} style={{ gap: 4 }}>
            <Note>{p.commissionsTotal}</Note>
            {commissions.map(([currency, amount]) => (
              <AmountText key={currency} amount={amount} currency={currency} strong />
            ))}
          </View>
        ) : null}
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
