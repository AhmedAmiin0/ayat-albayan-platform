import { type BubbleWord, TICK_PATHS, type TickKind } from '@ab/shared';
import Svg, { Path } from 'react-native-svg';
import { t } from '../../lib/i18n/i18n';
import { type, useTheme } from '../../theme';
import { AppText } from '../../ui/primitives/AppText';

const WORD: Record<BubbleWord, () => string> = {
  failed: () => t.enums.messageStatus.failed,
  unconfirmed: () => t.messages.unconfirmedTick,
  manual: () => t.messages.manualTick,
};

interface TickGlyphProps {
  kind: TickKind;
  ink: string;
  word: BubbleWord | null;
}

export function TickGlyph({ kind, ink, word }: TickGlyphProps) {
  const { color } = useTheme();
  return (
    <>
      <Svg
        viewBox="0 0 20 20"
        width={16}
        height={16}
        color={ink}
        testID="ticks-glyph"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Path
          d={TICK_PATHS[kind]}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      {word ? (
        <AppText
          style={{
            fontFamily: type.ui[600],
            fontSize: type.size['2xs'],
            lineHeight: type.lineHeight(type.size['2xs']),
            // Text needs AA, unlike the glyph: manual in the muted ink, unsent in saffron.
            color: word === 'manual' ? color.ink3 : ink,
          }}
        >
          {WORD[word]()}
        </AppText>
      ) : null}
    </>
  );
}
