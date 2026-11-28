import { Pressable, View } from 'react-native';
import { shape, type, useTheme } from '../../../theme';
import { AppText } from '../../../ui/primitives/AppText';
import type { AttachTileProps } from './AttachTile.types';
import { tileStyle } from './attach-tile.helpers';

/**
 * One cell of the attach sheet's even three-column grid (WhatsApp's attach grid): a 56pt circle and
 * its word under it, one line at 12sp («…» only as a last resort).
 */
export function AttachTile({ label, short, onPress, children }: AttachTileProps) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={tileStyle}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: shape.radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: color.lapisWash,
        }}
      >
        {children}
      </View>
      <AppText
        numberOfLines={1}
        ellipsizeMode="tail"
        style={{
          alignSelf: 'stretch',
          fontFamily: type.ui[500],
          fontSize: type.size['2xs'],
          lineHeight: type.lineHeight(type.size['2xs']),
          color: color.ink,
          textAlign: 'center',
        }}
      >
        {short ?? label}
      </AppText>
    </Pressable>
  );
}
