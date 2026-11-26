import { ActivityIndicator } from 'react-native';
import { t, shape, space, type, useTheme, AppText, ErrorState, Section } from '@ab/mobile-kit';
import type { QuotePreviewProps } from './QuotePreview.types';

/** A held text is the last choice's and may not leave, so it is dimmed. */
const HELD_OPACITY = 0.6;

/** The message as the client will read it; until a price comes, the wait or the failed load. */
export function QuotePreview({ offer }: QuotePreviewProps) {
  const { color } = useTheme();
  const waiting = offer.failed ? (
    <ErrorState onRetry={offer.retry} />
  ) : (
    <ActivityIndicator color={color.lapis} />
  );
  return (
    <Section title={t.inbox.quote.preview}>
      {offer.text === null ? (
        waiting
      ) : (
        <AppText
          testID="quote-preview"
          style={{
            padding: space[3],
            borderRadius: shape.radius.md,
            borderWidth: 1,
            borderColor: color.rule,
            backgroundColor: color.sunk,
            fontFamily: type.ui[400],
            fontSize: type.size.body,
            lineHeight: type.lineHeight(type.size.body),
            color: color.ink,
            opacity: offer.held ? HELD_OPACITY : 1,
          }}
        >
          {offer.text}
        </AppText>
      )}
    </Section>
  );
}
