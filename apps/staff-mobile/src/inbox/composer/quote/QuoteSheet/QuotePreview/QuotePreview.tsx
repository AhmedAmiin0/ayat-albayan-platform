import { t, shape, space, type, useTheme, AppText, Section } from '@ab/mobile-kit';
import type { QuotePreviewProps } from './QuotePreview.types';
import { HELD_OPACITY } from './quote-preview.helpers';
import { QuoteWaiting } from './QuoteWaiting';

/** The message as the client will read it; until a price comes, the wait or the failed load. */
export function QuotePreview({ offer }: QuotePreviewProps) {
  const { color } = useTheme();
  return (
    <Section title={t.inbox.quote.preview}>
      {offer.text === null ? (
        <QuoteWaiting offer={offer} />
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
