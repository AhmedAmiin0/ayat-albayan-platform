import { View } from 'react-native';
import { gridRows } from '@/classroom/room/model/room-grid';
import type { RoomPlatform, RoomTile } from '@/classroom/room/model/room-types';
import { t } from '@/core/lib/i18n/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { type, useTheme } from '@/theme';
import { ParticipantTile } from './ParticipantTile';

interface ParticipantGridProps {
  tiles: readonly RoomTile[];
  Video: RoomPlatform['Video'];
  front: boolean;
}

/** The grid (docs/35 §3): a shared screen on its own row first, the cameras one or two per row. */
export function ParticipantGrid({ tiles, Video, front }: ParticipantGridProps) {
  const { color } = useTheme();
  const rows = gridRows(tiles);
  const alone = tiles.filter((x) => !x.screen).length <= 1;
  return (
    <View testID="room-grid" style={{ flex: 1, gap: 8, paddingHorizontal: 8 }}>
      {rows.map((row) => (
        <View
          key={row.map((x) => x.key).join('|')}
          style={{ flex: row[0]?.screen ? 2 : 1, flexDirection: 'row', gap: 8 }}
        >
          {row.map((tile) => (
            <ParticipantTile key={tile.key} tile={tile} Video={Video} front={front} />
          ))}
        </View>
      ))}
      {alone ? (
        <AppText
          accessibilityLiveRegion="polite"
          style={{ textAlign: 'center', fontSize: type.size.sm, color: color.coverInk }}
        >
          {t.classroom.waiting}
        </AppText>
      ) : null}
    </View>
  );
}
