import { t } from '@/core/lib/i18n/i18n';
import { useTheme } from '@/theme';
import { IconButton } from '@/core/ui/primitives/IconButton';
import { PriceIcon } from '../../shared/chat-icons';

/** «عرض سعر» in the composer row (admin and sales with pricing.read, never a teacher): opens the sheet. */
export function QuoteButton({ onPress }: { onPress: () => void }) {
  const { color } = useTheme();
  return (
    <IconButton testID="quote-button" label={t.inbox.quote.open} onPress={onPress}>
      <PriceIcon color={color.lapis} />
    </IconButton>
  );
}
