import { View } from 'react-native';
import type { RoomPlatform, RoomTile } from '@/classroom/room/model/room-types';
import { t } from '@/core/lib/i18n/i18n';
import { Avatar } from '@/core/ui/primitives/Avatar';
import { shape, useTheme } from '@/theme';
import { TileCaption } from './TileCaption';

interface ParticipantTileProps {
  tile: RoomTile;
  Video: RoomPlatform['Video'];
  /** One's own front camera is mirrored, like a mirror. */
  front: boolean;
}

/** «أنت», «شاشة …», or the participant's name. */
function tileName(tile: RoomTile): string {
  if (tile.screen) return t.classroom.screenOf.replace('{name}', tile.name);
  return tile.local ? t.classroom.you : tile.name;
}

/** One tile: the video (or the initials while the camera is off), its caption, a speaking edge. */
export function ParticipantTile({ tile, Video, front }: ParticipantTileProps) {
  const { color } = useTheme();
  const name = tileName(tile);
  const muted = !tile.micOn && !tile.screen;
  return (
    <View
      testID={`room-tile-${tile.key}`}
      accessible
      accessibilityLabel={muted ? `${name}, ${t.classroom.muted}` : name}
      style={{
        flex: 1,
        borderRadius: shape.radius.lg,
        overflow: 'hidden',
        backgroundColor: color.leatherDeep,
        borderWidth: 2,
        borderColor: tile.speaking ? color.gold : 'transparent',
      }}
    >
      {tile.video ? (
        <Video video={tile.video} mirror={tile.local && !tile.screen && front} />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Avatar name={tile.name} size="lg" decorative />
        </View>
      )}
      <TileCaption name={name} muted={muted} />
    </View>
  );
}
