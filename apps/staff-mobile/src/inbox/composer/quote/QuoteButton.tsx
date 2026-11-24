import { t, useTheme, IconButton } from '@ab/mobile-kit';
import { PriceIcon } from '@/inbox/shared/chat-icons';

/** Admin and sales with pricing.read only, never a teacher. */
export function QuoteButton({ onPress, compact }: { onPress: () => void; compact?: boolean }) {
  const { color } = useTheme();
  return (
    <IconButton testID="quote-button" label={t.inbox.quote.open} onPress={onPress} compact={compact}>
      <PriceIcon color={color.lapis} />
    </IconButton>
  );
}
