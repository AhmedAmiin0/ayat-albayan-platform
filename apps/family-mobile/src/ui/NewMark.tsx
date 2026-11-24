import { View } from 'react-native';
import { AppText, t, type, useTheme } from '@ab/mobile-kit';

/** docs/50 §6: a word in a chip, not colour alone. */
export function NewMark() {
  const { color } = useTheme();
  return (
    <View style={{ paddingHorizontal: 8, borderRadius: 999, backgroundColor: color.actSoft }}>
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size['2xs'], color: color.act }}>
        {t.portal.newReport}
      </AppText>
    </View>
  );
}
