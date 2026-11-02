import { View } from 'react-native';
import { AppText } from '@/core/ui/primitives/AppText';
import { MicOffIcon } from '@/inbox';
import { shape, type, useTheme } from '@/theme';

interface TileCaptionProps {
  name: string;
  muted: boolean;
}

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
      {muted ? <MicOffIcon color={color.coverInk} size={16} /> : null}
      <AppText
        numberOfLines={1}
        style={{
          flexShrink: 1,
          fontSize: type.size.xs,
          color: color.coverInk,
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
