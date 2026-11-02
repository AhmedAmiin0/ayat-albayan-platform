import type { MuteSource } from '@ab/shared';
import { IconButton } from '@/components/ui/form/icon-button';
import { t } from '@/lib/i18n/i18n';
import { RoomIcon } from '@/features/teaching/classroom/room/components/room-icons';
import type { TileView } from '@/features/teaching/classroom/room/components/room-types';
import type { MuteController } from './use-mute';

const M = t.classroom.mute;
const LABEL: Record<MuteSource, { short: string; of: string; icon: 'mic' | 'cam' }> = {
  microphone: { short: M.mic, of: M.micOf, icon: 'mic' },
  camera: { short: M.cam, of: M.camOf, icon: 'cam' },
};
const SOURCES: readonly MuteSource[] = ['microphone', 'camera'];

/** The tile's corner «كتم الميكروفون» / «إيقاف الكاميرا» (named for the person), where allowed. */
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
