import { Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { palette, shape, type } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';

/** «إغلاق» at the top start of a full-screen viewer (photo, video), light on the black in either scheme. */
export function ViewerClose({ onClose, label = t.common.close }: { onClose: () => void; label?: string }) {
  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: 8 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onClose}
        hitSlop={8}
        style={{ minHeight: shape.control.touch, minWidth: shape.control.touch, justifyContent: 'center', paddingHorizontal: 8 }}
      >
        <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.body, color: palette.dark.ink }}>{t.common.close}</AppText>
      </Pressable>
    </View>
  );
}
