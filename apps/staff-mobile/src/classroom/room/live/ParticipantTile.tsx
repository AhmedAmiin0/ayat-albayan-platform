import { View } from 'react-native';
import type { RoomPlatform, RoomTile } from '@/classroom/room/model/room-types';
import { t, Avatar, shape, useTheme } from '@ab/mobile-kit';
import { SwitchCameraIcon } from '@/inbox';
import { ExpandIcon } from './room-icons';
import { TileAction } from './TileAction';
import { TileCaption } from './TileCaption';

export interface TileActions {
  /** One's own front camera is mirrored, like a mirror. */
  front: boolean;
  switchCamera: () => void;
  /** «تكبير» / «تصغير» a shared screen. */
  zoom: (key: string) => void;
  zoomed: string | null;
}

interface ParticipantTileProps {
  tile: RoomTile;
  Video: RoomPlatform['Video'];
  actions: TileActions;
}

/** «أنت», «شاشة …», or the participant's name. */
function tileName(tile: RoomTile): string {
  if (tile.screen) return t.classroom.screenOf.replace('{name}', tile.name);
  return tile.local ? t.classroom.you : tile.name;
}

/** The tile's corner button: «تكبير» on a screen, «بدّل الكاميرا» on one's own camera. */
function Corner({ tile, actions }: Pick<ParticipantTileProps, 'tile' | 'actions'>) {
  const S = t.classroom.stage;
  if (tile.screen) {
    const label = actions.zoomed === tile.key ? S.minimize : S.maximize;
    return (
      <TileAction
        label={label}
        onPress={() => actions.zoom(tile.key)}
        icon={(ink) => <ExpandIcon color={ink} />}
      />
    );
  }
  if (!tile.local || !tile.camOn) return null;
  return (
    <TileAction
      label={t.mobileRoom.controls.switchCamera}
      onPress={actions.switchCamera}
      icon={(ink) => <SwitchCameraIcon color={ink} />}
    />
  );
}

/**
 * One tile: the video (or the initials while the camera is off), its caption, a speaking edge. A
 * shared screen fits whole (never cropped), a camera fills its tile.
 */
export function ParticipantTile({ tile, Video, actions }: ParticipantTileProps) {
  const { color } = useTheme();
  const name = tileName(tile);
  const muted = !tile.micOn && !tile.screen;
  const mirror = tile.local && !tile.screen && actions.front;
  return (
    <View
      testID={`room-tile-${tile.key}`}
      style={{
        flex: 1,
        borderRadius: shape.radius.lg,
        overflow: 'hidden',
        backgroundColor: color.leatherDeep,
        borderWidth: 2,
        borderColor: tile.speaking ? color.gold : 'transparent',
      }}
    >
      <View
        accessible
        accessibilityLabel={muted ? `${name}, ${t.classroom.muted}` : name}
        style={{ flex: 1 }}
      >
        {tile.video ? (
          <Video video={tile.video} mirror={mirror} fit={tile.screen ? 'contain' : 'cover'} />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Avatar name={tile.name} size="lg" decorative />
          </View>
        )}
        <TileCaption name={name} muted={muted} />
      </View>
      <Corner tile={tile} actions={actions} />
    </View>
  );
}
