import { View } from 'react-native';
import { shape, type, useTheme } from '../../../theme';
import { NuqtaGlyph } from '../../primitives/NuqtaGlyph';
import { AppText } from '../../primitives/AppText';
import type { StatusChipProps } from './StatusChip.types';
import { toneColors } from './status-chip.helpers';

/** Status is glyph, word and tone (never colour alone); saffron comes only from the maps. */
export function StatusChip({ tone, glyph, label, size = 'md' }: StatusChipProps) {
  const { color } = useTheme();
  const { fg, bg } = toneColors(color, tone);
  const md = size === 'md';
  return (
    <View
      testID={`chip-${tone}`}
      style={{
        alignSelf: 'flex-start',
        flexShrink: 1, // in a capped slot the word ellipsizes inside the pill instead of overflowing it
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        minHeight: md ? 26 : 22, // grows with a large font scale instead of clipping
        paddingStart: md ? 9 : 7,
        paddingEnd: md ? 11 : 9,
        borderRadius: shape.radius.pill,
        borderWidth: 1,
        borderColor: `${fg}40`, // tone at 25 %
        backgroundColor: bg,
      }}
    >
      <NuqtaGlyph shape={glyph} color={fg} />
      <AppText
        numberOfLines={1}
        style={{ flexShrink: 1, fontFamily: type.ui[600], fontSize: type.size.xs, color: fg }}
      >
        {label}
      </AppText>
    </View>
  );
}
