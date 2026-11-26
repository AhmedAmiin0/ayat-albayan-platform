import type { MuteSource } from '@ab/schedule';
import { IconButton } from '@ab/web-kit/components/ui/form/IconButton';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { RoomIcon } from '@ab/web-kit/classroom/room/components/room-icons';
import type { TileView } from '@ab/web-kit/classroom/room/components/room-types';
import type { MuteController } from '@ab/web-kit/classroom/mute/use-mute';

const M = t.classroom.mute;
const LABEL: Record<MuteSource, { short: string; of: string; icon: 'mic' | 'cam' }> = {
  microphone: { short: M.mic, of: M.micOf, icon: 'mic' },
  camera: { short: M.cam, of: M.camOf, icon: 'cam' },
};
const SOURCES: readonly MuteSource[] = ['microphone', 'camera'];

export function MuteButtons({ tile, mute }: { tile: TileView; mute: MuteController }) {
  return (
    <>
      {SOURCES.filter((s) => mute.canMute(tile, s)).map((source) => (
        <IconButton
          key={source}
          label={LABEL[source].of.replace('{name}', tile.name)}
          title={LABEL[source].short}
          onClick={() => mute.mute(tile, source)}
          className="bg-inverse/85 text-on-inverse hover:bg-sunk hover:text-ink"
        >
          <RoomIcon name={LABEL[source].icon} />
        </IconButton>
      ))}
    </>
  );
}
