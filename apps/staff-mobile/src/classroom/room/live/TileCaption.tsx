import { View } from 'react-native';
import { AppText, palette, shape, type, useTheme } from '@ab/mobile-kit';
import { MicOffIcon } from '@/inbox';

interface TileCaptionProps {
  name: string;
  muted: boolean;
}

/**
 * The caption sits on the dark scrim over video in BOTH themes: the light theme's coverInk is dark
 * green (unreadable there), so the ink is the dark theme's light cover ink, always.
 */
export const SCRIM_INK = palette.dark.coverInk;

/** The name at the tile's foot (start side), on the scrim, with a struck mic while muted. */
export function TileCaption({ name, muted }: TileCaptionProps) {
  const { color } = useTheme();
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{
        position: 'absolute',
        bottom: 6,
        start: 6,
        end: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
      }}
    >
      {muted ? <MicOffIcon color={SCRIM_INK} size={16} /> : null}
      <AppText
        testID="tile-caption"
        numberOfLines={1}
        style={{
          flexShrink: 1,
          fontSize: type.size.xs,
          color: SCRIM_INK,
          backgroundColor: color.scrim,
          paddingHorizontal: 6,
          borderRadius: shape.radius.sm,
        }}
      >
        {name}
      </AppText>
    </View>
  );
}
