import { Button } from '@ab/web-kit/components/ui/form/Button';
import { Drawer } from '@ab/web-kit/components/ui/overlay/Drawer';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { ParticipantRow } from './ParticipantRow';
import type { ParticipantsSheetProps } from './ParticipantsSheet.types';
import { cameraTiles } from './participants-sheet.helpers';

export function ParticipantsSheet({ tiles, kick, mute, onClose }: ParticipantsSheetProps) {
  const people = cameraTiles(tiles);
  return (
    <Drawer title={t.classroom.people} onClose={onClose}>
      {mute.canMuteAll && (
        <Button type="button" variant="secondary" size="sm" className="mb-2" onClick={mute.muteAll}>
          {t.classroom.mute.all}
        </Button>
      )}
      <ul aria-label={t.classroom.people}>
        {people.map((tile) => (
          <ParticipantRow key={tile.key} tile={tile} kick={kick} mute={mute} />
        ))}
      </ul>
    </Drawer>
  );
}
