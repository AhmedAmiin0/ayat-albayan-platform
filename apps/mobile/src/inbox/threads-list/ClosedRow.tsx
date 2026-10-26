import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { ClosedNote } from '../thread/components/ClosedNote';
import { QuoteButton } from '../composer/quote/QuoteButton';
import { SavedRepliesButton } from '../saved-replies/SavedRepliesButton';

/**
 * The row once the 24 h window closed: why (ClosedNote), «الردود السريعة» dimmed with its reason
 * (staff only), «عرض سعر» (its sheet still copies) and «أرسل قالبًا».
 */
export function ClosedRow({ known, staff, onTemplate, onQuote }: { known: boolean; staff: boolean; onTemplate: () => void; onQuote?: (() => void) | undefined }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <ClosedNote known={known} />
      {staff ? <SavedRepliesButton open={false} onPress={() => undefined} /> : null}
      {onQuote ? <QuoteButton onPress={onQuote} /> : null}
      <Button label={t.inbox.composer.sendTemplate} onPress={onTemplate} />
    </View>
  );
}
