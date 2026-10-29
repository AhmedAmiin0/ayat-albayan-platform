import type { WalletTotals } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { type, useTheme } from '@/theme';
import { MoneyCard } from '../components/MoneyCard';
import { byCurrency, walletMoney } from '../lib/money-text';

const W = t.assistantPortal.wallet;

/**
 * «محفظتي»'s balance: one block per currency (never summed across them). Line 1 «مستحق لك» and the
 * amount, bold and tabular; line 2 «هذا الشهر +X · دُفع لك Y». Nothing yet: «لا رصيد مستحق الآن».
 */
export function WalletCard({ wallet }: { wallet: Readonly<Record<string, WalletTotals>> }) {
  const { color } = useTheme();
  const rows = byCurrency(wallet);
  const small = { fontFamily: type.ui[400], fontSize: type.size.xs, color: color.ink2, fontVariant: ['tabular-nums' as const] };
  return (
    <MoneyCard>
      {rows.length === 0 ? (
        <AppText style={{ ...small, fontSize: type.size.sm }}>{W.none}</AppText>
      ) : (
        rows.map(([currency, w]) => (
          <View key={currency} testID={`wallet-${currency}`} style={{ gap: 2, minHeight: 44, justifyContent: 'center' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.sm, color: color.ink2 }}>{W.due}</AppText>
              <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.h4, color: color.ink, fontVariant: ['tabular-nums'] }}>
                {walletMoney(w.due, currency)}
              </AppText>
            </View>
            <AppText style={small}>
              {`${W.thisMonth.replace('{amount}', walletMoney(w.this_month, currency, w.this_month > 0))} · ${W.paid.replace('{amount}', walletMoney(w.paid, currency))}`}
            </AppText>
          </View>
        ))
      )}
    </MoneyCard>
  );
}
