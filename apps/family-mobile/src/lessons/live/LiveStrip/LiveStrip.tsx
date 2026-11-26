import type { LiveRoom } from '@ab/client-core';
import { View } from 'react-native';
import { AppText, Avatar, type, useTheme } from '@ab/mobile-kit';
import { liveText } from '@/lessons/live/live-text';

/** Faces shown before the names; the rest are only named. */
const FACES = 3;

/** Names the portal does not reveal get a role word instead. */
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
        {text.faces.slice(0, FACES).map((face, i) => (
          <View
            key={`${face}-${String(i)}`}
            // A 2pt ring of the strip's green parts the overlapping faces.
            style={{
              marginStart: i === 0 ? 0 : -10,
              borderWidth: 2,
              borderRadius: 999,
              borderColor: color.lapisHover,
            }}
          >
            <Avatar name={face} decorative />
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
