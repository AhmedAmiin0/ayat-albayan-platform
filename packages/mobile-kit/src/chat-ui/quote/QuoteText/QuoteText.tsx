import { View } from 'react-native';
import { ContentText } from '../../../ui/primitives/ContentText';
import type { QuoteTextProps } from './QuoteText.types';
import { GLYPH_ROW } from './quote-text.helpers';
import { useQuoteText } from './use-quote-text';

/** The quoted line on the side of its own language, after a file's emoji or drawn icon. */
export function QuoteText(p: QuoteTextProps) {
  const { lineStyle, words } = useQuoteText(p);
  if (!p.glyph)
    return (
      <ContentText source={p.text} numberOfLines={1} style={lineStyle}>
        {words}
      </ContentText>
    );
  return (
    <View style={GLYPH_ROW}>
      {p.glyph}
      <ContentText source={p.text} numberOfLines={1} style={lineStyle}>
        {words}
      </ContentText>
    </View>
  );
}
