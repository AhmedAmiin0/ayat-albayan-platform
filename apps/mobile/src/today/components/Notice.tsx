import { View } from 'react-native';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { NuqtaGlyph } from '@/core/ui/primitives/NuqtaGlyph';

/**
 * The inverse note after a lesson change lands (docs/07 §10 toast look, inline: «الحلقة اتلغت»).
 * Announced politely; it goes when the action hook resets it.
 * TODO(R-MOB-02): «تراجع» needs an undo route (confirmed → scheduled is not a move today).
 */
export function Notice({ message }: { message: string }) {
  const { color, elevation } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: shape.radius.lg,
        backgroundColor: color.inverse,
        boxShadow: elevation.toast,
      }}
    >
      <NuqtaGlyph shape="fill" color={color.inverseGold} size={13} />
      <AppText
        accessibilityLiveRegion="polite"
        style={{
          flex: 1,
          fontFamily: type.ui[500],
          fontSize: type.size.sm,
          lineHeight: type.lineHeight(type.size.sm),
          color: color.onInverse,
        }}
      >
        {message}
      </AppText>
    </View>
  );
}
