import type { LiveRoom } from '@ab/client-core';
import { View } from 'react-native';
import { AppText, t, type, useTheme } from '@ab/mobile-kit';
import { liveText } from './live-text';

/** The live card's top (canvas RoomXLiveHome): «● الحلقة جارية الآن», then how long it has run. */
export function LiveTop({ live }: { live: LiveRoom }) {
  const { color } = useTheme();
  const words = { color: color.onLapis, fontSize: type.size.xs };
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            borderWidth: 2,
            borderColor: color.onLapis,
            backgroundColor: color.ok,
          }}
        />
        <AppText style={{ ...words, fontFamily: type.ui[700] }}>{t.portal.now}</AppText>
      </View>
      <AppText accessibilityRole="timer" style={words}>
        {liveText(live).since}
      </AppText>
    </View>
  );
}
