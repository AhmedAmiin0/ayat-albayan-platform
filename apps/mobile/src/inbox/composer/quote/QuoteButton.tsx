import { t, useTheme, IconButton } from '@ab/mobile-kit';
import { PriceIcon } from '@/inbox/shared/chat-icons';

/** «عرض سعر» in the composer row (admin and sales with pricing.read, never a teacher): opens the sheet. */
export function QuoteButton({ onPress, compact }: { onPress: () => void; compact?: boolean }) {
  const { color } = useTheme();
  return (
    <IconButton testID="quote-button" label={t.inbox.quote.open} onPress={onPress} compact={compact}>
      <PriceIcon color={color.lapis} />
    </IconButton>
  );
}
