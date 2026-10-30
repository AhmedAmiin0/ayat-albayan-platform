import { payoutStatusStyle, type AssistantStatementView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { CardTitle } from './CardTitle';
import { CurrencyTotalsBlock } from './CurrencyTotalsBlock';
import { LinesToggle } from './LinesToggle';
import { MoneyCard } from './MoneyCard';
import { statementMonth, statementWhen } from '@/sales-money/lib/money-text';

/** One month's statement of mine (web StatementCard): status, when, the totals per currency, its lines. */
export function MyStatementCard({ statement: s }: { statement: AssistantStatementView }) {
  const when = statementWhen(s);
  return (
    <MoneyCard>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <CardTitle>{statementMonth(s)}</CardTitle>
        <StatusChip {...payoutStatusStyle[s.status]} label={t.enums.payoutStatus[s.status]} size="sm" />
      </View>
      {when ? <Note>{when}</Note> : null}
      <CurrencyTotalsBlock totals={s.totals} label={statementMonth(s)} />
      <LinesToggle lines={s.lines} />
    </MoneyCard>
  );
}
