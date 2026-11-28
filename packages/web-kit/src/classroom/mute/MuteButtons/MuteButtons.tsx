import { IconButton } from '@ab/web-kit/components/ui/form/IconButton';
import { RoomIcon } from '@ab/web-kit/classroom/room/components/room-icons';
import type { MuteButtonsProps } from './MuteButtons.types';
import { LABEL, SOURCES } from './mute-buttons.helpers';

export function MuteButtons({ tile, mute }: MuteButtonsProps) {
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
