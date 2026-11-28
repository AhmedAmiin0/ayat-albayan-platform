import { IconButton } from '@ab/web-kit/components/ui/form/IconButton';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { RoomIcon } from '@ab/web-kit/classroom/room/components/room-icons';
import type { KickButtonProps } from './KickButton.types';

export function KickButton({ tile, onAsk }: KickButtonProps) {
  return (
    <IconButton
      label={t.classroom.kick.actionOf.replace('{name}', tile.name)}
      title={t.classroom.kick.action}
      onClick={() => onAsk(tile)}
      className="bg-inverse/85 text-on-inverse hover:bg-danger-soft hover:text-danger"
    >
      <RoomIcon name="kick" />
    </IconButton>
  );
}
