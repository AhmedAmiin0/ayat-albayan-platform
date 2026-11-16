import { TICK_PATHS, type TickKind } from '@ab/shared';
import Svg, { Path } from 'react-native-svg';
import { t } from '../../lib/i18n/i18n';
import { type, useTheme } from '../../theme';
import { AppText } from '../../ui/primitives/AppText';

type Word = 'failed' | 'manual';

const WORD: Record<Word, () => string> = {
  failed: () => t.enums.messageStatus.failed,
  manual: () => t.messages.manualTick,
};

interface TickGlyphProps {
  kind: TickKind;
  ink: string;
  word: Word | null;
}

/** The ticks' image and, for failed / by hand, their word («لم تُرسل», «يدويًا»). */
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
            // Text needs AA, unlike the glyph: «يدويًا» in the muted ink, «لم تُرسل» in saffron.
            color: word === 'manual' ? color.ink3 : ink,
          }}
        >
          {WORD[word]()}
        </AppText>
      ) : null}
    </>
  );
}
