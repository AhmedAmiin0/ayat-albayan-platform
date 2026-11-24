import { payoutStatusStyle, type PayoutView } from '@ab/money';
import { t, ListRow, StatusChip } from '@ab/mobile-kit';
import { amountText } from '@/finance/shared/format';

/** A teacher's statement for the month: name, lessons and amount, its state; taps open the detail. */
export function PayoutRow({ payout, onPress }: { payout: PayoutView; onPress: () => void }) {
  return (
    <ListRow
      title={payout.teacher.display_name_ar}
      subtitle={t.mobileFinance.payouts.lessonsAmount
        .replace('{lessons}', String(payout.lessons_count))
        .replace('{amount}', amountText(payout.amount))}
      trailing={<StatusChip {...payoutStatusStyle[payout.status]} label={t.enums.payoutStatus[payout.status]} size="sm" />}
      onPress={onPress}
    />
  );
}
