import type { PaymentLinkQuoteView } from '@ab/shared';
import type { UseQueryResult } from '@tanstack/react-query';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { AppText } from '@/core/ui/primitives/AppText';
import { Note } from '@/more';
import { planText } from '@/subscribe';
import { type, useTheme } from '@/theme';
import { linkErrorText, minLine, referenceLine } from './link-text';

interface LinkPriceSectionProps {
  quote: UseQueryResult<PaymentLinkQuoteView>;
  /** «مبلغ مخصص» on: the admin's lowest amount is said too. */
  custom: boolean;
}

/** The calculator price (POST /sales/payment-links/quote) as the reference, and the admin's lowest amount. */
export function LinkPriceSection({ quote, custom }: LinkPriceSectionProps) {
  const { color } = useTheme();
  if (quote.isError) return <ErrorState message={linkErrorText(quote.error)} onRetry={() => void quote.refetch()} />;
  if (!quote.data) return <Note>{t.common.loading}</Note>;
  const { quote: q, min_amount: min } = quote.data;
  const small = { fontFamily: type.ui[500], fontSize: type.size.sm, color: color.ink2 };
  return (
    <View accessibilityState={{ busy: quote.isPlaceholderData }} style={{ gap: 4, opacity: quote.isPlaceholderData ? 0.6 : 1 }}>
      <AppText
        accessibilityLiveRegion="polite"
        style={{ fontFamily: type.ui[600], fontSize: type.size.base, lineHeight: type.lineHeight(type.size.base), color: color.ink }}
      >
        {referenceLine(q.afterDiscount, q.currency)}
      </AppText>
      <AppText style={small}>{planText(q)}</AppText>
      {custom && min !== null ? <AppText style={small}>{minLine(min, q.currency)}</AppText> : null}
    </View>
  );
}
