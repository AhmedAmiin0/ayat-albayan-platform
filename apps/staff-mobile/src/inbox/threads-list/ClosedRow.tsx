import { View } from 'react-native';
import { t, Button } from '@ab/mobile-kit';
import { ClosedNote } from '@/inbox/thread/components/ClosedNote';
import { QuoteButton } from '@/inbox/composer/quote/QuoteButton';
import { SavedRepliesButton } from '@/inbox/saved-replies/components/SavedRepliesButton';

/** The note sits on its own line so it never squeezes beside the button. */
export function ClosedRow({ known, staff, onTemplate, onQuote }: { known: boolean; staff: boolean; onTemplate: () => void; onQuote?: (() => void) | undefined }) {
  return (
    <View style={{ gap: 6 }}>
      {known ? null : <ClosedNote known={false} />}
      <View testID="closed-row" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {staff ? <SavedRepliesButton open={false} onPress={() => undefined} /> : null}
        {onQuote ? <QuoteButton onPress={onQuote} /> : null}
        <View style={{ flex: 1 }}>
          <Button
            variant={known ? 'secondary' : 'primary'}
            label={t.inbox.composer.sendTemplate}
            onPress={onTemplate}
          />
        </View>
      </View>
    </View>
  );
}
