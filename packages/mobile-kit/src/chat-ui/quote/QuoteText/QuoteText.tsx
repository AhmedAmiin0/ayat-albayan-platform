import { View } from 'react-native';
import { type, useTheme } from '../../../theme';
import { ContentText } from '../../../ui/primitives/ContentText';
import { quoteLine } from '../quote-style';
import type { QuoteTextProps } from './QuoteText.types';

/** The quoted line on the side of its own language, after a file's emoji or drawn icon. */
export function QuoteText({ text, icon, glyph, style }: QuoteTextProps) {
  const { color } = useTheme();
  const line = (
    <ContentText
      source={text}
      numberOfLines={1}
      style={{ ...style, fontFamily: type.ui[400], color: color.ink2 }}
    >
      {glyph ? text : quoteLine(icon, text)}
    </ContentText>
  );
  if (!glyph) return line;
  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {glyph}
      {line}
    </View>
  );
}
