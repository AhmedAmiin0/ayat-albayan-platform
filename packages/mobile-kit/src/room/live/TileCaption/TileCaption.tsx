import { View } from 'react-native';
import { AppText } from '../../../ui';
import { shape, type, useTheme } from '../../../theme';
import { MicOffIcon } from '../../../ui';
import type { TileCaptionProps } from './TileCaption.types';

/**
 * The name at the tile's foot (start side) with a struck mic while muted, on a SOLID inverse chip:
 * a translucent scrim over video left it at 2.3–3.4:1; inverse / onInverse holds AA in both themes.
 */
export function TileCaption({ name, muted }: TileCaptionProps) {
  const { color } = useTheme();
  return (
    <View
      testID="tile-caption"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{
        position: 'absolute',
        bottom: 6,
        start: 6,
        maxWidth: '90%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 6,
        borderRadius: shape.radius.sm,
        backgroundColor: color.inverse,
      }}
    >
      {muted ? <MicOffIcon color={color.onInverse} size={16} /> : null}
      <AppText
        testID="tile-caption-name"
        numberOfLines={1}
        style={{ flexShrink: 1, fontSize: type.size.xs, color: color.onInverse }}
      >
        {name}
      </AppText>
    </View>
  );
}
