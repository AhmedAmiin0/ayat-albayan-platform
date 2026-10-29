import { walletStateStyle, type MyCommissionRow } from '@ab/shared';
import { memo } from 'react';
import { View } from 'react-native';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { AppText } from '@/core/ui/primitives/AppText';
import { type, useTheme } from '@/theme';
import { commissionLine, walletMoney, walletStateText } from '../lib/money-text';

/**
 * One commission of «عمولاتي» in two lines (WhatsApp-compact, ≥ 44pt): «+50 ج.م» and its state chip, then
 * code · student · kind · how it was paid · day. A voided one: the amount struck through with no sign, then why.
 * Its list's inset card draws the fill and the rules.
 */
export const CommissionEntry = memo(function CommissionEntry({ entry }: { entry: MyCommissionRow }) {
  const { color } = useTheme();
  const voided = entry.state === 'voided';
  return (
    <View style={{ gap: 2, minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <AppText
          style={{
            fontFamily: type.ui[700],
            fontSize: type.size.body,
            color: voided ? color.ink3 : color.ink,
            fontVariant: ['tabular-nums'],
            textDecorationLine: voided ? 'line-through' : 'none',
          }}
        >
          {walletMoney(entry.amount, entry.currency, !voided)}
        </AppText>
        <StatusChip size="sm" {...walletStateStyle[entry.state]} label={walletStateText(entry)} />
      </View>
      <AppText numberOfLines={1} style={{ fontFamily: type.ui[400], fontSize: type.size.xs, color: color.ink2 }}>
        {commissionLine(entry)}
      </AppText>
    </View>
  );
});
