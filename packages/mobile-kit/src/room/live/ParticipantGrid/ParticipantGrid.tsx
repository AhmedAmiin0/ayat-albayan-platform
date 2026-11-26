import { useState } from 'react';
import { View } from 'react-native';
import { gridRows } from '../../model/room-grid';
import type { RoomPlatform, RoomTile } from '../../model/room-types';
import { t } from '../../../lib/i18n/i18n';
import { AppText } from '../../../ui';
import { type, useTheme } from '../../../theme';
import { ParticipantTile, type TileActions } from '../ParticipantTile';

interface ParticipantGridProps {
  tiles: readonly RoomTile[];
  Video: RoomPlatform['Video'];
  actions: Pick<TileActions, 'front' | 'switchCamera'>;
}

/** docs/35 §3: zoom gives a shared screen the whole grid until unzoom or the share stops. */
export function ParticipantGrid({ tiles, Video, actions }: ParticipantGridProps) {
  const { color } = useTheme();
  const [zoomed, setZoomed] = useState<string | null>(null);
  const big = tiles.find((x) => x.screen && x.key === zoomed);
  const rows = big ? [[big]] : gridRows(tiles);
  const alone = tiles.filter((x) => !x.screen).length <= 1;
  const tileActions: TileActions = {
    ...actions,
    zoomed: big ? big.key : null,
    zoom: (key) => setZoomed((was) => (was === key ? null : key)),
  };
  return (
    <View testID="room-grid" style={{ flex: 1, gap: 8, paddingHorizontal: 8 }}>
      {rows.map((row) => (
        <View
          key={row.map((x) => x.key).join('|')}
          style={{ flex: row[0]?.screen ? 2 : 1, flexDirection: 'row', gap: 8 }}
        >
          {row.map((tile) => (
            <ParticipantTile key={tile.key} tile={tile} Video={Video} actions={tileActions} />
          ))}
        </View>
      ))}
      {alone && !big ? (
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
