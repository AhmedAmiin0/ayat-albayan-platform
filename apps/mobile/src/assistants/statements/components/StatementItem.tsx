import { payoutStatusStyle, type AssistantStatementView } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { CardTitle } from '@/sales-money/components/CardTitle';
import { MoneyCard } from '@/sales-money/components/MoneyCard';
import { statementMonth, statementWhen } from '@/sales-money/lib/money-text';
import { StatementLines } from '@/sales-money/components/StatementLines';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { StatementActionBar } from './StatementActionBar';
import type { StatementCan } from '@/assistants/statements/hooks/statement-can';
import { StatementTotals } from './StatementTotals';

interface StatementItemProps {
  statement: AssistantStatementView;
  can: StatementCan;
  onPay: () => void;
  onNotice: (text: string) => void;
}

/** One salesperson's month (web statement-columns): name and month, status and when, totals per currency, its actions. */
export function StatementItem({ statement: s, can, onPay, onNotice }: StatementItemProps) {
  const [linesOpen, setLinesOpen] = useState(false);
  const when = statementWhen(s);
  return (
    <MoneyCard>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <CardTitle>{`${s.assistant.name} · ${statementMonth(s)}`}</CardTitle>
        <StatusChip {...payoutStatusStyle[s.status]} label={t.enums.payoutStatus[s.status]} size="sm" />
      </View>
      {when ? <Note>{when}</Note> : null}
      <StatementTotals totals={s.totals} />
      {s.method ? <Note>{t.mobileFinance.payouts.method.replace('{method}', t.enums.paymentMethod[s.method])}</Note> : null}
      {s.note ? <Note>{t.mobileFinance.payouts.note.replace('{note}', s.note)}</Note> : null}
      {linesOpen ? <StatementLines lines={s.lines} /> : null}
      <StatementActionBar statement={s} can={can} linesOpen={linesOpen} onLines={() => setLinesOpen((o) => !o)} onPay={onPay} onNotice={onNotice} />
    </MoneyCard>
  );
}
