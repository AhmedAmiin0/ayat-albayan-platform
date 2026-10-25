import { offerText } from '@ab/shared';
import ar from '@ab/shared/i18n/ar.json';
import { Linking, Share, View } from 'react-native';
import { t } from '@/lib/i18n';
import { Button } from '@/core/ui/primitives/Button';
import type { QuoteResponse } from './use-quote';

export interface OfferActionsProps {
  quote: QuoteResponse;
  /** True while the card still shows the previous choice's price: nothing may be sent. */
  stale: boolean;
}

/**
 * «أرسله على واتساب» opens WhatsApp's chat picker with the site's offer text (no number: the staff
 * member picks the guardian). «انسخ العرض للعميل» opens the share sheet, which has Copy.
 */
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
        variant="ghost"
        label={t.pricing.cta}
        busy={stale}
        onPress={() => void Share.share({ message: text })}
      />
    </View>
  );
}
