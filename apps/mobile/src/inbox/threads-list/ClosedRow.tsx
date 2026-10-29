import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { ClosedNote } from '../thread/components/ClosedNote';
import { QuoteButton } from '../composer/quote/QuoteButton';
import { SavedRepliesButton } from '../saved-replies/components/SavedRepliesButton';

/**
 * The reply box once the 24 h window closed: why (ClosedNote) on its own full-width line, so it never
 * wraps word by word beside the button (owner 2026-10-27, a new number's note squeezed into a narrow
 * column); under it the row in reading order as OpenRow (it mirrors with the phone): «الردود السريعة»
 * dimmed with its reason (staff only), «عرض سعر» (its sheet still copies), then «أرسل قالبًا» filling
 * the rest. No pill, no microphone.
 */
export function ClosedRow({ known, staff, onTemplate, onQuote }: { known: boolean; staff: boolean; onTemplate: () => void; onQuote?: (() => void) | undefined }) {
  return (
    <View style={{ gap: 6 }}>
      <ClosedNote known={known} />
      <View testID="closed-row" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {staff ? <SavedRepliesButton open={false} onPress={() => undefined} /> : null}
        {onQuote ? <QuoteButton onPress={onQuote} /> : null}
        <View style={{ flex: 1 }}>
          <Button label={t.inbox.composer.sendTemplate} onPress={onTemplate} />
        </View>
      </View>
    </View>
  );
}
