import { ActivityIndicator } from 'react-native';
import { useTheme, ErrorState } from '@ab/mobile-kit';
import type { QuoteWaitingProps } from './QuoteWaiting.types';

/** Until a price comes: the wait, or the failed load with a retry. */
export function QuoteWaiting({ offer }: QuoteWaitingProps) {
  const { color } = useTheme();
  if (offer.failed) return <ErrorState onRetry={offer.retry} />;
  return <ActivityIndicator color={color.lapis} />;
}
