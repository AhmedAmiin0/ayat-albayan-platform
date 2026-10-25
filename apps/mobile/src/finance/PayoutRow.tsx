import { payoutStatusStyle, type PayoutView } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { ListRow } from '@/core/ui/layout/ListRow';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { amountText } from './format';

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
