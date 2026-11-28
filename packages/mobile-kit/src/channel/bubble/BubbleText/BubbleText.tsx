import { splitLinks } from '@ab/shared';
import { type, useTheme } from '../../../theme';
import { ContentText } from '../../../ui/primitives/ContentText';
import type { BubbleTextProps } from './BubbleText.types';
import { BubblePart } from './BubblePart';

/**
 * A message's words (the ChatX boards: 15pt Noto, 24 line, ink), aligned by their own language,
 * links clickable (splitLinks).
 */
export function BubbleText({ body }: BubbleTextProps) {
  const { color } = useTheme();
  return (
    <ContentText
      source={body}
      style={{
        fontFamily: type.ui[400],
        fontSize: type.size.body,
        lineHeight: type.lineHeight(type.size.body),
        color: color.ink,
      }}
    >
      {splitLinks(body).map((part, i) => (
        <BubblePart key={i} part={part} />
      ))}
    </ContentText>
  );
}
