import { View } from 'react-native';
import type { RoomPlatform, RoomTile } from '../model/room-types';
import { t } from '../../lib/i18n/i18n';
import { Avatar } from '../../ui';
import { shape, useTheme } from '../../theme';
import { SwitchCameraIcon } from '../../ui';
import { ExpandIcon } from './room-icons';
import { TileAction } from './TileAction';
import { TileCaption } from './TileCaption';

export interface TileActions {
  /** One's own front camera is mirrored, like a mirror. */
  front: boolean;
  switchCamera: () => void;
  zoom: (key: string) => void;
  zoomed: string | null;
}

interface ParticipantTileProps {
  tile: RoomTile;
  Video: RoomPlatform['Video'];
  actions: TileActions;
}

function tileName(tile: RoomTile): string {
  if (tile.screen) return t.classroom.screenOf.replace('{name}', tile.name);
  return tile.local ? t.classroom.you : tile.name;
}

function tileLabel(tile: RoomTile, name: string): string {
  const parts = [
    name,
    tile.role && !tile.screen ? t.classroom.roles[tile.role] : null,
    !tile.micOn && !tile.screen ? t.classroom.muted : null,
    tile.speaking ? t.classroom.speaking : null,
  ];
  return parts.filter((x) => x !== null).join(t.common.listSeparator);
}

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
        borderWidth: 3,
        borderColor: tile.speaking ? color.gold : 'transparent',
      }}
    >
      <View
        accessible
        accessibilityLabel={tileLabel(tile, name)}
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
