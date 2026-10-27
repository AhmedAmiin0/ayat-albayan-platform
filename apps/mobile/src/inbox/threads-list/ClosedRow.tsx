import { I18nManager, View } from 'react-native';
import { physicalRow } from '../shared/physical-row';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { ClosedNote } from '../thread/components/ClosedNote';
import { QuoteButton } from '../composer/quote/QuoteButton';
import { SavedRepliesButton } from '../saved-replies/SavedRepliesButton';

/**
 * The row once the 24 h window closed, physical left → right as OpenRow (owner 2026-10-27):
 * «الردود السريعة» dimmed with its reason (staff only), «عرض سعر» (its sheet still copies), why
 * (ClosedNote), then «أرسل قالبًا» on the right where «أرسل» sits.
 */
export function ClosedRow({ known, staff, onTemplate, onQuote }: { known: boolean; staff: boolean; onTemplate: () => void; onQuote?: (() => void) | undefined }) {
  return (
    <View testID="closed-row" style={{ flexDirection: physicalRow(I18nManager.isRTL).direction, alignItems: 'center', gap: 8 }}>
      {staff ? <SavedRepliesButton open={false} onPress={() => undefined} /> : null}
      {onQuote ? <QuoteButton onPress={onQuote} /> : null}
      <ClosedNote known={known} />
      <Button label={t.inbox.composer.sendTemplate} onPress={onTemplate} />
    </View>
  );
}
