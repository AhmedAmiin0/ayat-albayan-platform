import { offerText } from '@ab/money';
import ar from '@ab/shared/i18n/ar.json';
import { Linking, Share, View } from 'react-native';
import { t, Button } from '@ab/mobile-kit';
import type { QuoteResponse } from '@/finance/pricing/use-quote';

export interface OfferActionsProps {
  quote: QuoteResponse;
  /** True while the card still shows the previous choice's price: nothing may be sent. */
  stale: boolean;
}

/** The WhatsApp share has no number so the staff member picks the guardian. */
export function OfferActions({ quote, stale }: OfferActionsProps) {
  // The guardian reads it on WhatsApp: Arabic whatever the UI language (parent-facing output).
  const text = offerText(quote, ar.pricing);
  return (
    <View style={{ gap: 8 }}>
      <Button
        label={t.pricing.sendWhatsapp}
        busy={stale}
        onPress={() => void Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`)}
      />
      <Button
        variant="secondary"
        label={t.pricing.cta}
        busy={stale}
        onPress={() => void Share.share({ message: text })}
      />
    </View>
  );
}
