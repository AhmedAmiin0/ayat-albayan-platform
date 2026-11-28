import { useTheme } from '../../../../theme';
import { AppText } from '../../../../ui/primitives/AppText';
import type { BubblePartProps } from './BubblePart.types';
import { openPart } from './bubble-part.helpers';

/** One run of a message's words: a link opens in the browser, plain words stay as they are. */
export function BubblePart({ part }: BubblePartProps) {
  const { color } = useTheme();
  if (!part.href) return part.text;
  return (
    <AppText
      accessibilityRole="link"
      onPress={() => openPart(part)}
      style={{ color: color.lapis, textDecorationLine: 'underline' }}
    >
      {part.text}
    </AppText>
  );
}
