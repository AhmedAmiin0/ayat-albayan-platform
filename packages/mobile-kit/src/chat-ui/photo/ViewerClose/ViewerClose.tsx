import { Pressable, View } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { palette, type } from '../../../theme';
import { AppText } from '../../../ui/primitives/AppText';
import type { ViewerCloseProps } from './ViewerClose.types';
import { BUTTON } from './viewer-close.helpers';

/** Light on black in either scheme. */
export function ViewerClose({ onClose, label = t.common.close }: ViewerCloseProps) {
  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: 8 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onClose}
        hitSlop={8}
        style={BUTTON}
      >
        <AppText
          style={{ fontFamily: type.ui[600], fontSize: type.size.body, color: palette.dark.ink }}
        >
          {t.common.close}
        </AppText>
      </Pressable>
    </View>
  );
}
