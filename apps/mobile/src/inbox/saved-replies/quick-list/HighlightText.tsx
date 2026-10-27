import type { TextStyle } from 'react-native';
import { AppText } from '@/core/ui/primitives/AppText';
import { ContentText } from '@/core/ui/primitives/ContentText';
import { highlightParts } from '@ab/shared';

interface HighlightTextProps {
  text: string;
  /** What was typed after «/»: those letters are drawn in `strong`. */
  query: string;
  style: TextStyle;
  strong: TextStyle;
  numberOfLines?: number;
}

/**
 * A line with the searched letters in bold, as WhatsApp's quick-reply list (nested runs, one text),
 * aligned by its own language (ContentText).
 */
export function HighlightText({ text, query, style, strong, numberOfLines }: HighlightTextProps) {
  return (
    <ContentText source={text} numberOfLines={numberOfLines} style={style}>
      {highlightParts(text, query).map((part, i) =>
        part.match ? (
          <AppText key={i} style={strong}>
            {part.text}
          </AppText>
        ) : (
          part.text
        ),
      )}
    </ContentText>
  );
}
