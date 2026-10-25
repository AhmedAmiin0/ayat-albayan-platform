import type { SalesQuoteView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { money } from '@/payments/format';
import { planText } from '@/subscribe/QuotePreview';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { ltr } from '@/core/ui/primitives/Ltr';

/**
 * The amount the family transfers (POST /sales/subscriptions/quote), the admin's preview without
 * the conversion details the sales view never carries. Shown, never typed.
 */
export function SalesQuotePreview({ quote: q, stale }: { quote: SalesQuoteView; stale: boolean }) {
  const { color } = useTheme();
  const small = { fontFamily: type.ui[500], fontSize: type.size.sm, color: color.ink2 };
  return (
    <View
      accessibilityState={{ busy: stale }}
      style={{
        gap: 6,
        padding: 14,
        borderRadius: shape.radius.lg,
        borderWidth: 1,
        borderColor: color.rule,
        backgroundColor: color.raised,
        opacity: stale ? 0.6 : 1,
      }}
    >
      <AppText
        accessibilityLiveRegion="polite"
        style={{
          fontFamily: type.display,
          fontSize: type.size.h1,
          lineHeight: type.lineHeight(type.size.h1, true),
          color: color.ink,
        }}
      >
        {money(q.afterDiscount, q.currency)}
      </AppText>
      <AppText style={small}>{planText(q)}</AppText>
      {q.discount > 0 ? <AppText style={small}>{`${t.pricing.discountLabel} ${ltr(`${q.discount}%`)}`}</AppText> : null}
      <Note>{t.salesMoney.priceHint}</Note>
    </View>
  );
}
