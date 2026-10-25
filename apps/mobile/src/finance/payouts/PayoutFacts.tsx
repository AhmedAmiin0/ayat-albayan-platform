import { payoutStatusStyle, type PayoutView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { breakdownLines, monthLabel, payoutWhen } from '@/teacher/payout-text';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { amountText } from '../shared/format';
import { dueOf } from './payout-actions';

/** One statement: teacher, month, status, lessons × rate per length, what was already paid, when. */
export function PayoutFacts({ payout }: { payout: PayoutView }) {
  const { color } = useTheme();
  const when = payoutWhen(payout);
  const m = t.mobileFinance.payouts;
  return (
    <View style={{ gap: 8, padding: 12, borderRadius: shape.radius.lg, borderWidth: 1, borderColor: color.rule, backgroundColor: color.raised }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <AppText style={{ flexShrink: 1, fontFamily: type.ui[700], fontSize: type.size.base, color: color.ink }}>
          {`${payout.teacher.display_name_ar} · ${monthLabel(payout.month)}`}
        </AppText>
        <StatusChip {...payoutStatusStyle[payout.status]} label={t.enums.payoutStatus[payout.status]} size="sm" />
      </View>
      <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.h3, color: color.ink, fontVariant: ['tabular-nums'] }}>
        {m.lessonsAmount.replace('{lessons}', String(payout.lessons_count)).replace('{amount}', amountText(payout.amount))}
      </AppText>
      {breakdownLines(payout).map((line) => (
        <Note key={line}>{line}</Note>
      ))}
      {payout.ledger_paid ? <Note>{t.earnings.ledgerPaid.replace('{amount}', amountText(payout.ledger_paid))}</Note> : null}
      {payout.status === 'approved' ? <Note>{m.due.replace('{amount}', amountText(dueOf(payout)))}</Note> : null}
      {payout.method ? <Note>{m.method.replace('{method}', t.enums.paymentMethod[payout.method])}</Note> : null}
      {payout.note ? <Note>{m.note.replace('{note}', payout.note)}</Note> : null}
      {when ? <Note>{when}</Note> : null}
    </View>
  );
}
