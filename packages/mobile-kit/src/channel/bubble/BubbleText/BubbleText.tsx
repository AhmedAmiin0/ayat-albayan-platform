import { splitLinks } from '@ab/shared';
import { type, useTheme } from '../../../theme';
import { AppText } from '../../../ui/primitives/AppText';
import { ContentText } from '../../../ui/primitives/ContentText';
import type { BubbleTextProps } from './BubbleText.types';
import { open } from './bubble-text.helpers';

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
      {splitLinks(body).map((part, i) =>
        part.href ? (
          <AppText
            key={i}
            accessibilityRole="link"
            onPress={() => open(part.href ?? '')}
            style={{ color: color.lapis, textDecorationLine: 'underline' }}
          >
            {part.text}
          </AppText>
        ) : (
          part.text
        ),
      )}
    </ContentText>
  );
}
