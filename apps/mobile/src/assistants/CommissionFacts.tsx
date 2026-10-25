import { formatAmount, type AssistantCommissionView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { instantDay, money } from '@/payments/format';
import { AmountText } from '@/sales-money/AmountText';
import { CardTitle } from '@/sales-money/CardTitle';
import { Ltr } from '@/core/ui/primitives/Ltr';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { commissionStatusStyle } from './commission-style';

const L = t.assistants.ledger;

/** One commission (web commission-columns): student and code, salesperson, rate of the price, amount, day, status and why voided. */
export function CommissionFacts({ commission: c }: { commission: AssistantCommissionView }) {
  const rate = c.type === 'percent' ? L.ratePercent.replace('{value}', formatAmount(c.rate)) : L.rateFixed;
  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <CardTitle>{c.student.name}</CardTitle>
        <AmountText amount={c.amount} currency={c.currency} strong />
      </View>
      <Ltr style={{ alignSelf: 'flex-start' }}>{c.student.code}</Ltr>
      <Note>{`${L.assistant}: ${c.assistant.name}`}</Note>
      <Note>
        {t.mobileSalesMoney.earnedLine
          .replace('{rate}', rate)
          .replace('{base}', money(c.base_amount, c.base_currency))
          .replace('{date}', instantDay(c.earned_at))}
      </Note>
      <View style={{ alignItems: 'flex-start', gap: 4 }}>
        <StatusChip size="sm" {...commissionStatusStyle[c.status]} label={L.status[c.status]} />
        {c.void_reason ? <Note>{L.voidedWhy.replace('{reason}', c.void_reason)}</Note> : null}
        {c.voided_at ? <Note>{t.mobileSalesMoney.voidedAt.replace('{date}', instantDay(c.voided_at))}</Note> : null}
      </View>
    </>
  );
}
