import type { LiveRoom } from '@ab/client-core';
import { View } from 'react-native';
import { AppText, Avatar, type, useTheme } from '@ab/mobile-kit';
import { liveText } from './live-text';

/** Faces shown before the names; the rest are only named. */
const FACES = 3;

/**
 * Who is in the room now (canvas RoomXLiveHome), on the deeper green: their faces overlapping,
 * «المعلم/ة في الغرفة الآن» over the names with their role.
 */
export function LiveStrip({ live }: { live: LiveRoom }) {
  const { color } = useTheme();
  const text = liveText(live);
  const ink = { color: color.onLapis };
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: color.lapisHover,
      }}
    >
      <View style={{ flexDirection: 'row' }}>
        {live.people.slice(0, FACES).map((p, i) => (
          <View key={`${p.role}-${p.name}`} style={{ marginStart: i === 0 ? 0 : -10 }}>
            <Avatar name={p.name} decorative />
          </View>
        ))}
      </View>
      <View style={{ flex: 1 }}>
        <AppText style={{ ...ink, fontFamily: type.ui[600], fontSize: type.size.body }}>
          {text.title}
        </AppText>
        <AppText style={{ ...ink, fontSize: type.size.xs }}>{text.who}</AppText>
      </View>
    </View>
  );
}
