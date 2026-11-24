import type { LiveRoom } from '@ab/client-core';
import { View } from 'react-native';
import { AppText, type, useTheme } from '@ab/mobile-kit';
import { liveText } from './live-text';

export function LiveLine({ live }: { live: LiveRoom }) {
  const { color } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color.ok }} />
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.xs, color: color.ok }}>
        {liveText(live).row}
      </AppText>
    </View>
  );
}
