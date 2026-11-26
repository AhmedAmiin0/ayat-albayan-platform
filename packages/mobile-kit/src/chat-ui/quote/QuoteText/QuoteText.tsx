import type { ReactNode } from 'react';
import { type TextStyle, View } from 'react-native';
import { type, useTheme } from '../../../theme';
import { ContentText } from '../../../ui/primitives/ContentText';
import { quoteLine } from '../quote-style';

interface QuoteTextProps {
  text: string;
  /** A file's emoji before the words (the staff inbox). */
  icon?: string | null;
  /** A drawn file icon before the words, in place of the emoji (the student channel). */
  glyph?: ReactNode;
  style: TextStyle;
}

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
